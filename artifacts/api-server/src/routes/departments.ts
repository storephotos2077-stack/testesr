import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, departmentsTable, employeesTable } from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/departments", requireAuth, async (req, res): Promise<void> => {
  const depts = await db.select().from(departmentsTable).orderBy(departmentsTable.name);

  const counts = await db
    .select({ departmentId: employeesTable.departmentId, count: count() })
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"))
    .groupBy(employeesTable.departmentId);

  const countMap = new Map(counts.map((c) => [c.departmentId, Number(c.count)]));

  res.json(
    depts.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      headId: d.headId,
      employeeCount: countMap.get(d.id) ?? 0,
      createdAt: d.createdAt.toISOString(),
    })),
  );
});

router.post("/departments", isHR, async (req, res): Promise<void> => {
  const { name, description, headId } = req.body;
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [dept] = await db
    .insert(departmentsTable)
    .values({ name, description, headId })
    .returning();

  res.status(201).json({
    id: dept.id,
    name: dept.name,
    description: dept.description,
    headId: dept.headId,
    employeeCount: 0,
    createdAt: dept.createdAt.toISOString(),
  });
});

router.patch("/departments/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, description, headId } = req.body;

  const [dept] = await db
    .update(departmentsTable)
    .set({ name, description, headId })
    .where(eq(departmentsTable.id, id))
    .returning();

  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  const [ct] = await db
    .select({ count: count() })
    .from(employeesTable)
    .where(eq(employeesTable.departmentId, id));

  res.json({
    id: dept.id,
    name: dept.name,
    description: dept.description,
    headId: dept.headId,
    employeeCount: Number(ct?.count ?? 0),
    createdAt: dept.createdAt.toISOString(),
  });
});

router.delete("/departments/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
  res.sendStatus(204);
});

export default router;
