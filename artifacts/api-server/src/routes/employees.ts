import { Router, type IRouter } from "express";
import { eq, ilike, and, count, or } from "drizzle-orm";
import { db, employeesTable, departmentsTable, designationsTable } from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

function buildEmployeeRow(
  e: typeof employeesTable.$inferSelect,
  deptName?: string | null,
  desigName?: string | null,
  managerName?: string | null,
) {
  return {
    id: e.id,
    fullName: e.fullName,
    employeeCode: e.employeeCode,
    email: e.email,
    phone: e.phone,
    avatarUrl: e.avatarUrl,
    dateOfBirth: e.dateOfBirth,
    gender: e.gender,
    address: e.address,
    departmentId: e.departmentId,
    departmentName: deptName ?? null,
    designationId: e.designationId,
    designationName: desigName ?? null,
    managerId: e.managerId,
    managerName: managerName ?? null,
    status: e.status,
    employmentType: e.employmentType,
    hireDate: e.hireDate,
    salary: e.salary ? Number(e.salary) : null,
    emergencyContactName: e.emergencyContactName,
    emergencyContactPhone: e.emergencyContactPhone,
    createdAt: e.createdAt.toISOString(),
  };
}

function buildSummaryRow(
  e: typeof employeesTable.$inferSelect,
  deptName?: string | null,
  desigName?: string | null,
) {
  return {
    id: e.id,
    fullName: e.fullName,
    employeeCode: e.employeeCode,
    email: e.email,
    avatarUrl: e.avatarUrl,
    departmentName: deptName ?? null,
    designationName: desigName ?? null,
    status: e.status,
  };
}

async function enrichEmployees(employees: (typeof employeesTable.$inferSelect)[]) {
  const depts = await db.select().from(departmentsTable);
  const desigs = await db.select().from(designationsTable);
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));
  const desigMap = new Map(desigs.map((d) => [d.id, d.name]));

  return { deptMap, desigMap };
}

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "20", 10);
  const offset = (page - 1) * limit;
  const department = req.query.department ? parseInt(req.query.department as string, 10) : undefined;
  const designation = req.query.designation ? parseInt(req.query.designation as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const conditions = [];
  if (department) conditions.push(eq(employeesTable.departmentId, department));
  if (designation) conditions.push(eq(employeesTable.designationId, designation));
  if (status) conditions.push(eq(employeesTable.status, status as "active" | "inactive" | "on_leave" | "terminated"));
  if (search) {
    conditions.push(
      or(
        ilike(employeesTable.fullName, `%${search}%`),
        ilike(employeesTable.email, `%${search}%`),
        ilike(employeesTable.employeeCode, `%${search}%`),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [employees, totalResult] = await Promise.all([
    db
      .select()
      .from(employeesTable)
      .where(whereClause)
      .orderBy(employeesTable.fullName)
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(employeesTable).where(whereClause),
  ]);

  const { deptMap, desigMap } = await enrichEmployees(employees);

  res.json({
    data: employees.map((e) => buildSummaryRow(e, deptMap.get(e.departmentId ?? 0), desigMap.get(e.designationId ?? 0))),
    total: Number(totalResult[0]?.count ?? 0),
    page,
    limit,
  });
});

router.post("/employees", isHR, async (req, res): Promise<void> => {
  const body = req.body;
  if (!body.fullName || !body.email || !body.hireDate) {
    res.status(400).json({ error: "fullName, email, and hireDate are required" });
    return;
  }

  // Generate employee code
  const [lastEmp] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .orderBy(employeesTable.id)
    .limit(1)
    .offset((await db.select({ count: count() }).from(employeesTable))[0].count - 1 >= 0 ? Number((await db.select({ count: count() }).from(employeesTable))[0].count) - 1 : 0);

  const allEmps = await db.select({ count: count() }).from(employeesTable);
  const empNum = Number(allEmps[0]?.count ?? 0) + 1;
  const employeeCode = `EMP${String(empNum).padStart(4, "0")}`;

  const [emp] = await db
    .insert(employeesTable)
    .values({
      fullName: body.fullName,
      employeeCode,
      email: body.email,
      phone: body.phone,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      address: body.address,
      departmentId: body.departmentId,
      designationId: body.designationId,
      managerId: body.managerId,
      status: body.status ?? "active",
      employmentType: body.employmentType ?? "full_time",
      hireDate: body.hireDate,
      salary: body.salary?.toString(),
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
    })
    .returning();

  const { deptMap, desigMap } = await enrichEmployees([emp]);
  const managerRows = emp.managerId
    ? await db.select().from(employeesTable).where(eq(employeesTable.id, emp.managerId))
    : [];

  res.status(201).json(
    buildEmployeeRow(emp, deptMap.get(emp.departmentId ?? 0), desigMap.get(emp.designationId ?? 0), managerRows[0]?.fullName),
  );
});

router.get("/employees/org-chart", requireAuth, async (_req, res): Promise<void> => {
  const employees = await db.select().from(employeesTable).where(eq(employeesTable.status, "active"));
  const { deptMap, desigMap } = await enrichEmployees(employees);

  const nodes = employees.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    designationName: desigMap.get(e.designationId ?? 0) ?? null,
    departmentName: deptMap.get(e.departmentId ?? 0) ?? null,
    avatarUrl: e.avatarUrl,
    managerId: e.managerId,
    children: [] as unknown[],
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const roots: typeof nodes = [];

  for (const node of nodes) {
    if (node.managerId && nodeMap.has(node.managerId)) {
      nodeMap.get(node.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  res.json(roots);
});

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));

  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const { deptMap, desigMap } = await enrichEmployees([emp]);
  const managerRows = emp.managerId
    ? await db.select().from(employeesTable).where(eq(employeesTable.id, emp.managerId))
    : [];

  res.json(
    buildEmployeeRow(emp, deptMap.get(emp.departmentId ?? 0), desigMap.get(emp.designationId ?? 0), managerRows[0]?.fullName),
  );
});

router.patch("/employees/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const body = req.body;

  const updateData: Partial<typeof employeesTable.$inferInsert> = {};
  const fields = [
    "fullName", "email", "phone", "dateOfBirth", "gender", "address",
    "departmentId", "designationId", "managerId", "status", "employmentType",
    "hireDate", "emergencyContactName", "emergencyContactPhone",
  ] as const;

  for (const field of fields) {
    if (field in body) (updateData as Record<string, unknown>)[field] = body[field];
  }
  if ("salary" in body) updateData.salary = body.salary?.toString();

  const [emp] = await db
    .update(employeesTable)
    .set(updateData)
    .where(eq(employeesTable.id, id))
    .returning();

  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const { deptMap, desigMap } = await enrichEmployees([emp]);
  const managerRows = emp.managerId
    ? await db.select().from(employeesTable).where(eq(employeesTable.id, emp.managerId))
    : [];

  res.json(
    buildEmployeeRow(emp, deptMap.get(emp.departmentId ?? 0), desigMap.get(emp.designationId ?? 0), managerRows[0]?.fullName),
  );
});

router.delete("/employees/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.update(employeesTable).set({ status: "terminated" }).where(eq(employeesTable.id, id));
  res.sendStatus(204);
});

router.get("/employees/:id/direct-reports", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const reports = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.managerId, id));

  const { deptMap, desigMap } = await enrichEmployees(reports);

  res.json(reports.map((e) => buildSummaryRow(e, deptMap.get(e.departmentId ?? 0), desigMap.get(e.designationId ?? 0))));
});

export default router;
