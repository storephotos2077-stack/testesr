import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, designationsTable, departmentsTable } from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/designations", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: designationsTable.id,
      name: designationsTable.name,
      departmentId: designationsTable.departmentId,
      departmentName: departmentsTable.name,
      createdAt: designationsTable.createdAt,
    })
    .from(designationsTable)
    .leftJoin(departmentsTable, eq(designationsTable.departmentId, departmentsTable.id))
    .orderBy(designationsTable.name);

  res.json(
    rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/designations", isHR, async (req, res): Promise<void> => {
  const { name, departmentId } = req.body;
  if (!name || !departmentId) {
    res.status(400).json({ error: "Name and departmentId are required" });
    return;
  }

  const [desig] = await db
    .insert(designationsTable)
    .values({ name, departmentId })
    .returning();

  const [dept] = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.id, departmentId));

  res.status(201).json({
    id: desig.id,
    name: desig.name,
    departmentId: desig.departmentId,
    departmentName: dept?.name ?? null,
    createdAt: desig.createdAt.toISOString(),
  });
});

router.patch("/designations/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, departmentId } = req.body;

  const [desig] = await db
    .update(designationsTable)
    .set({ name, departmentId })
    .where(eq(designationsTable.id, id))
    .returning();

  if (!desig) {
    res.status(404).json({ error: "Designation not found" });
    return;
  }

  const [dept] = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.id, desig.departmentId));

  res.json({
    id: desig.id,
    name: desig.name,
    departmentId: desig.departmentId,
    departmentName: dept?.name ?? null,
    createdAt: desig.createdAt.toISOString(),
  });
});

router.delete("/designations/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(designationsTable).where(eq(designationsTable.id, id));
  res.sendStatus(204);
});

export default router;
