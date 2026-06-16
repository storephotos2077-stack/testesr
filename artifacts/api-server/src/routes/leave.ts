import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  db,
  leaveTypesTable,
  leaveBalancesTable,
  leaveRequestsTable,
  employeesTable,
  profilesTable,
} from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

// ── Leave Types ────────────────────────────────────────────────────────────
router.get("/leave/types", requireAuth, async (_req, res): Promise<void> => {
  const types = await db.select().from(leaveTypesTable).orderBy(leaveTypesTable.name);
  res.json(types.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

router.post("/leave/types", isHR, async (req, res): Promise<void> => {
  const { name, description, defaultDays, carryForward, isPaid } = req.body;
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [lt] = await db
    .insert(leaveTypesTable)
    .values({ name, description, defaultDays: defaultDays ?? 0, carryForward: carryForward ?? false, isPaid: isPaid ?? true })
    .returning();
  res.status(201).json({ ...lt, createdAt: lt.createdAt.toISOString() });
});

router.patch("/leave/types/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [lt] = await db
    .update(leaveTypesTable)
    .set(req.body)
    .where(eq(leaveTypesTable.id, id))
    .returning();
  if (!lt) {
    res.status(404).json({ error: "Leave type not found" });
    return;
  }
  res.json({ ...lt, createdAt: lt.createdAt.toISOString() });
});

// ── Leave Balances ─────────────────────────────────────────────────────────
router.get("/leave/balances", requireAuth, async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.employeeId) conditions.push(eq(leaveBalancesTable.employeeId, parseInt(req.query.employeeId as string, 10)));
  if (req.query.year) conditions.push(eq(leaveBalancesTable.year, parseInt(req.query.year as string, 10)));

  const balances = await db
    .select()
    .from(leaveBalancesTable)
    .where(conditions.length ? and(...conditions) : undefined);

  const typeIds = [...new Set(balances.map((b) => b.leaveTypeId))];
  const empIds = [...new Set(balances.map((b) => b.employeeId))];

  const [allTypes, allEmps] = await Promise.all([
    db.select().from(leaveTypesTable),
    empIds.length > 0
      ? db.select().from(employeesTable)
      : Promise.resolve([]),
  ]);

  const typeMap = new Map(allTypes.map((t) => [t.id, t.name]));
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  res.json(
    balances.map((b) => ({
      id: b.id,
      employeeId: b.employeeId,
      employeeName: empMap.get(b.employeeId) ?? null,
      leaveTypeId: b.leaveTypeId,
      leaveTypeName: typeMap.get(b.leaveTypeId) ?? null,
      year: b.year,
      allocated: b.allocated,
      used: b.used,
      remaining: b.allocated - b.used,
    })),
  );
});

// ── Leave Requests ─────────────────────────────────────────────────────────
router.get("/leave/requests", requireAuth, async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.employeeId) conditions.push(eq(leaveRequestsTable.employeeId, parseInt(req.query.employeeId as string, 10)));
  if (req.query.status) conditions.push(eq(leaveRequestsTable.status, req.query.status as "pending" | "approved" | "rejected" | "cancelled"));
  if (req.query.startDate) conditions.push(gte(leaveRequestsTable.startDate, req.query.startDate as string));
  if (req.query.endDate) conditions.push(lte(leaveRequestsTable.endDate, req.query.endDate as string));

  const requests = await db
    .select()
    .from(leaveRequestsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(leaveRequestsTable.createdAt);

  const [allTypes, allEmps] = await Promise.all([
    db.select().from(leaveTypesTable),
    db.select().from(employeesTable),
  ]);

  const typeMap = new Map(allTypes.map((t) => [t.id, t.name]));
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  res.json(
    requests.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: empMap.get(r.employeeId) ?? null,
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: typeMap.get(r.leaveTypeId) ?? null,
      startDate: r.startDate,
      endDate: r.endDate,
      isHalfDay: r.isHalfDay,
      totalDays: Number(r.totalDays),
      reason: r.reason,
      status: r.status,
      reviewedById: r.reviewedById,
      reviewedByName: r.reviewedById ? empMap.get(r.reviewedById) ?? null : null,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reviewNotes: r.reviewNotes,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/leave/requests", requireAuth, async (req, res): Promise<void> => {
  const { leaveTypeId, startDate, endDate, isHalfDay, reason } = req.body;

  // Determine employeeId from profile
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.clerkId, req.userId!));

  const employeeId = profile?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: "No employee record linked to your profile" });
    return;
  }

  // Calculate total days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const totalDays = isHalfDay ? 0.5 : Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

  const [req_] = await db
    .insert(leaveRequestsTable)
    .values({
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      isHalfDay: isHalfDay ?? false,
      totalDays: totalDays.toString(),
      reason,
      status: "pending",
    })
    .returning();

  const [lt] = await db.select().from(leaveTypesTable).where(eq(leaveTypesTable.id, leaveTypeId));
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));

  res.status(201).json({
    id: req_.id,
    employeeId: req_.employeeId,
    employeeName: emp?.fullName ?? null,
    leaveTypeId: req_.leaveTypeId,
    leaveTypeName: lt?.name ?? null,
    startDate: req_.startDate,
    endDate: req_.endDate,
    isHalfDay: req_.isHalfDay,
    totalDays: Number(req_.totalDays),
    reason: req_.reason,
    status: req_.status,
    reviewedById: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: req_.createdAt.toISOString(),
  });
});

router.get("/leave/requests/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [r] = await db.select().from(leaveRequestsTable).where(eq(leaveRequestsTable.id, id));
  if (!r) {
    res.status(404).json({ error: "Leave request not found" });
    return;
  }

  const [lt] = await db.select().from(leaveTypesTable).where(eq(leaveTypesTable.id, r.leaveTypeId));
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, r.employeeId));
  const reviewerRow = r.reviewedById
    ? await db.select().from(employeesTable).where(eq(employeesTable.id, r.reviewedById))
    : [];

  res.json({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: emp?.fullName ?? null,
    leaveTypeId: r.leaveTypeId,
    leaveTypeName: lt?.name ?? null,
    startDate: r.startDate,
    endDate: r.endDate,
    isHalfDay: r.isHalfDay,
    totalDays: Number(r.totalDays),
    reason: r.reason,
    status: r.status,
    reviewedById: r.reviewedById,
    reviewedByName: reviewerRow[0]?.fullName ?? null,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewNotes: r.reviewNotes,
    createdAt: r.createdAt.toISOString(),
  });
});

router.patch("/leave/requests/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status, reviewNotes } = req.body;

  const [r] = await db.select().from(leaveRequestsTable).where(eq(leaveRequestsTable.id, id));
  if (!r) {
    res.status(404).json({ error: "Leave request not found" });
    return;
  }

  // Find reviewer's employee ID
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.clerkId, req.userId!));

  const [updated] = await db
    .update(leaveRequestsTable)
    .set({
      status,
      reviewedById: profile?.employeeId,
      reviewedAt: new Date(),
      reviewNotes,
    })
    .where(eq(leaveRequestsTable.id, id))
    .returning();

  // Update leave balance if approved
  if (status === "approved") {
    const year = new Date(r.startDate).getFullYear();
    const [balance] = await db
      .select()
      .from(leaveBalancesTable)
      .where(
        and(
          eq(leaveBalancesTable.employeeId, r.employeeId),
          eq(leaveBalancesTable.leaveTypeId, r.leaveTypeId),
          eq(leaveBalancesTable.year, year),
        ),
      );

    if (balance) {
      await db
        .update(leaveBalancesTable)
        .set({ used: balance.used + Math.ceil(Number(r.totalDays)) })
        .where(eq(leaveBalancesTable.id, balance.id));
    }
  }

  const [lt] = await db.select().from(leaveTypesTable).where(eq(leaveTypesTable.id, updated.leaveTypeId));
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, updated.employeeId));
  const reviewerRow = updated.reviewedById
    ? await db.select().from(employeesTable).where(eq(employeesTable.id, updated.reviewedById))
    : [];

  res.json({
    id: updated.id,
    employeeId: updated.employeeId,
    employeeName: emp?.fullName ?? null,
    leaveTypeId: updated.leaveTypeId,
    leaveTypeName: lt?.name ?? null,
    startDate: updated.startDate,
    endDate: updated.endDate,
    isHalfDay: updated.isHalfDay,
    totalDays: Number(updated.totalDays),
    reason: updated.reason,
    status: updated.status,
    reviewedById: updated.reviewedById,
    reviewedByName: reviewerRow[0]?.fullName ?? null,
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    reviewNotes: updated.reviewNotes,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.get("/leave/calendar", requireAuth, async (req, res): Promise<void> => {
  const conditions = [eq(leaveRequestsTable.status, "approved")];
  if (req.query.startDate) conditions.push(gte(leaveRequestsTable.startDate, req.query.startDate as string));
  if (req.query.endDate) conditions.push(lte(leaveRequestsTable.endDate, req.query.endDate as string));

  const requests = await db
    .select()
    .from(leaveRequestsTable)
    .where(and(...conditions));

  const [allTypes, allEmps] = await Promise.all([
    db.select().from(leaveTypesTable),
    db.select().from(employeesTable),
  ]);

  const typeMap = new Map(allTypes.map((t) => [t.id, t.name]));
  const empMap = new Map(allEmps.map((e) => [e.id, { name: e.fullName, avatar: e.avatarUrl }]));

  res.json(
    requests.map((r) => ({
      employeeId: r.employeeId,
      employeeName: empMap.get(r.employeeId)?.name ?? "",
      avatarUrl: empMap.get(r.employeeId)?.avatar ?? null,
      startDate: r.startDate,
      endDate: r.endDate,
      leaveType: typeMap.get(r.leaveTypeId) ?? "Unknown",
      status: r.status,
    })),
  );
});

export default router;
