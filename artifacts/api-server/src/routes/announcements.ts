import { Router, type IRouter } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
import {
  db,
  announcementsTable,
  announcementReadsTable,
  departmentsTable,
  employeesTable,
  profilesTable,
} from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/announcements", requireAuth, async (req, res): Promise<void> => {
  const rawDeptId = req.query.departmentId ? parseInt(req.query.departmentId as string, 10) : undefined;
  const conditions =
    rawDeptId !== undefined && !isNaN(rawDeptId)
      ? [eq(announcementsTable.departmentId, rawDeptId)]
      : [];

  const announcements = await db
    .select()
    .from(announcementsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(announcementsTable.isPinned, announcementsTable.createdAt);

  const allDepts = await db.select().from(departmentsTable);
  const allEmps = await db.select().from(employeesTable);
  const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  const announcementIds = announcements.map((a) => a.id);

  const reads =
    announcementIds.length > 0
      ? await db
          .select({
            announcementId: announcementReadsTable.announcementId,
            profileId: announcementReadsTable.profileId,
          })
          .from(announcementReadsTable)
          .where(inArray(announcementReadsTable.announcementId, announcementIds))
      : [];

  const readsByAnnouncement = new Map<number, Set<number>>();
  for (const r of reads) {
    if (!readsByAnnouncement.has(r.announcementId)) {
      readsByAnnouncement.set(r.announcementId, new Set());
    }
    readsByAnnouncement.get(r.announcementId)!.add(r.profileId);
  }

  const currentProfileId = req.profileId;

  res.json(
    announcements.map((a) => {
      const seenProfiles = readsByAnnouncement.get(a.id) ?? new Set();
      return {
        id: a.id,
        title: a.title,
        content: a.content,
        departmentId: a.departmentId,
        departmentName: a.departmentId ? deptMap.get(a.departmentId) ?? null : null,
        postedById: a.postedById,
        postedByName: empMap.get(a.postedById) ?? null,
        isPinned: a.isPinned,
        createdAt: a.createdAt.toISOString(),
        seenByMe: currentProfileId ? seenProfiles.has(currentProfileId) : false,
        seenCount: seenProfiles.size,
      };
    }),
  );
});

router.post("/announcements", isHR, async (req, res): Promise<void> => {
  const { title, content, departmentId, isPinned } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.clerkId, req.userId!));

  const [ann] = await db
    .insert(announcementsTable)
    .values({
      title,
      content,
      departmentId,
      postedById: profile?.employeeId ?? 1,
      isPinned: isPinned ?? false,
    })
    .returning();

  const [dept] = ann.departmentId
    ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, ann.departmentId))
    : [undefined];

  res.status(201).json({
    id: ann.id,
    title: ann.title,
    content: ann.content,
    departmentId: ann.departmentId,
    departmentName: dept?.name ?? null,
    postedById: ann.postedById,
    postedByName: null,
    isPinned: ann.isPinned,
    createdAt: ann.createdAt.toISOString(),
    seenByMe: false,
    seenCount: 0,
  });
});

router.patch("/announcements/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid announcement id" });
    return;
  }

  const { title, content, departmentId, isPinned } = req.body;
  const updateData: Partial<typeof announcementsTable.$inferInsert> = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (departmentId !== undefined) updateData.departmentId = departmentId;
  if (isPinned !== undefined) updateData.isPinned = isPinned;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [ann] = await db
    .update(announcementsTable)
    .set(updateData)
    .where(eq(announcementsTable.id, id))
    .returning();

  if (!ann) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }

  const [readCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(announcementReadsTable)
    .where(eq(announcementReadsTable.announcementId, id));

  const seenByMeRows = req.profileId
    ? await db
        .select()
        .from(announcementReadsTable)
        .where(
          and(
            eq(announcementReadsTable.announcementId, id),
            eq(announcementReadsTable.profileId, req.profileId),
          ),
        )
        .limit(1)
    : [];

  res.json({
    id: ann.id,
    title: ann.title,
    content: ann.content,
    departmentId: ann.departmentId,
    departmentName: null,
    postedById: ann.postedById,
    postedByName: null,
    isPinned: ann.isPinned,
    createdAt: ann.createdAt.toISOString(),
    seenByMe: seenByMeRows.length > 0,
    seenCount: readCount?.count ?? 0,
  });
});

router.delete("/announcements/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid announcement id" });
    return;
  }
  await db.delete(announcementReadsTable).where(eq(announcementReadsTable.announcementId, id));
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.sendStatus(204);
});

router.post("/announcements/:id/mark-seen", requireAuth, async (req, res): Promise<void> => {
  const announcementId = parseInt(req.params.id as string, 10);
  if (isNaN(announcementId)) {
    res.status(400).json({ error: "Invalid announcement id" });
    return;
  }
  const profileId = req.profileId;

  if (!profileId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const existing = await db
    .select()
    .from(announcementReadsTable)
    .where(
      and(
        eq(announcementReadsTable.announcementId, announcementId),
        eq(announcementReadsTable.profileId, profileId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    res.json({ announcementId, seenAt: existing[0].seenAt.toISOString() });
    return;
  }

  const [read] = await db
    .insert(announcementReadsTable)
    .values({ announcementId, profileId })
    .returning();

  res.json({ announcementId: read.announcementId, seenAt: read.seenAt.toISOString() });
});

router.get("/announcements/:id/reads", isHR, async (req, res): Promise<void> => {
  const announcementId = parseInt(req.params.id as string, 10);
  if (isNaN(announcementId)) {
    res.status(400).json({ error: "Invalid announcement id" });
    return;
  }

  const reads = await db
    .select({
      profileId: announcementReadsTable.profileId,
      fullName: profilesTable.fullName,
      email: profilesTable.email,
      seenAt: announcementReadsTable.seenAt,
    })
    .from(announcementReadsTable)
    .leftJoin(profilesTable, eq(announcementReadsTable.profileId, profilesTable.id))
    .where(eq(announcementReadsTable.announcementId, announcementId))
    .orderBy(announcementReadsTable.seenAt);

  res.json(
    reads.map((r) => ({
      profileId: r.profileId,
      fullName: r.fullName ?? null,
      email: r.email ?? null,
      seenAt: r.seenAt.toISOString(),
    })),
  );
});

export default router;
