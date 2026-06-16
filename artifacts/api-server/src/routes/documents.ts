import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, documentsTable, employeesTable, profilesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.employeeId) conditions.push(eq(documentsTable.employeeId, parseInt(req.query.employeeId as string, 10)));
  if (req.query.type) conditions.push(eq(documentsTable.type, req.query.type as "contract" | "id_proof" | "certificate" | "policy" | "other"));

  const docs = await db
    .select()
    .from(documentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(documentsTable.createdAt);

  const allEmps = await db.select().from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  res.json(
    docs.map((d) => ({
      id: d.id,
      employeeId: d.employeeId,
      employeeName: d.employeeId ? empMap.get(d.employeeId) ?? null : null,
      name: d.name,
      type: d.type,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      uploadedById: d.uploadedById,
      isCompanyPolicy: d.isCompanyPolicy,
      createdAt: d.createdAt.toISOString(),
    })),
  );
});

router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const { employeeId, name, type, fileUrl, fileSize, isCompanyPolicy } = req.body;
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.clerkId, req.userId!));

  const [doc] = await db
    .insert(documentsTable)
    .values({
      employeeId,
      name,
      type: type ?? "other",
      fileUrl,
      fileSize,
      uploadedById: profile?.employeeId ?? profile?.id ?? 1,
      isCompanyPolicy: isCompanyPolicy ?? false,
    })
    .returning();

  const allEmps = await db.select().from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  res.status(201).json({
    id: doc.id,
    employeeId: doc.employeeId,
    employeeName: doc.employeeId ? empMap.get(doc.employeeId) ?? null : null,
    name: doc.name,
    type: doc.type,
    fileUrl: doc.fileUrl,
    fileSize: doc.fileSize,
    uploadedById: doc.uploadedById,
    isCompanyPolicy: doc.isCompanyPolicy,
    createdAt: doc.createdAt.toISOString(),
  });
});

router.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  res.sendStatus(204);
});

export default router;
