import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, payrollStructuresTable, payslipsTable, employeesTable } from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/payroll/structures", requireAuth, async (req, res): Promise<void> => {
  const conditions = req.query.employeeId
    ? [eq(payrollStructuresTable.employeeId, parseInt(req.query.employeeId as string, 10))]
    : [];

  const structures = await db
    .select()
    .from(payrollStructuresTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(payrollStructuresTable.effectiveDate);

  const empIds = [...new Set(structures.map((s) => s.employeeId))];
  const emps = empIds.length > 0
    ? await Promise.all(empIds.map((id) => db.select().from(employeesTable).where(eq(employeesTable.id, id))))
    : [];
  const empMap = new Map(emps.flat().map((e) => [e.id, e.fullName]));

  res.json(
    structures.map((s) => {
      const allowances = s.allowances as Record<string, number>;
      const deductions = s.deductions as Record<string, number>;
      const grossPay = Number(s.basicPay) + Object.values(allowances).reduce((a, b) => a + Number(b), 0);
      const netPay = grossPay - Object.values(deductions).reduce((a, b) => a + Number(b), 0);
      return {
        id: s.id,
        employeeId: s.employeeId,
        employeeName: empMap.get(s.employeeId) ?? null,
        basicPay: Number(s.basicPay),
        allowances,
        deductions,
        grossPay,
        netPay,
        effectiveDate: s.effectiveDate,
        createdAt: s.createdAt.toISOString(),
      };
    }),
  );
});

router.post("/payroll/structures", isHR, async (req, res): Promise<void> => {
  const { employeeId, basicPay, allowances, deductions, effectiveDate } = req.body;
  if (!employeeId || !basicPay || !effectiveDate) {
    res.status(400).json({ error: "employeeId, basicPay, and effectiveDate are required" });
    return;
  }

  const [s] = await db
    .insert(payrollStructuresTable)
    .values({ employeeId, basicPay: basicPay.toString(), allowances: allowances ?? {}, deductions: deductions ?? {}, effectiveDate })
    .returning();

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
  const allowancesObj = s.allowances as Record<string, number>;
  const deductionsObj = s.deductions as Record<string, number>;
  const grossPay = Number(s.basicPay) + Object.values(allowancesObj).reduce((a, b) => a + Number(b), 0);
  const netPay = grossPay - Object.values(deductionsObj).reduce((a, b) => a + Number(b), 0);

  res.status(201).json({
    id: s.id,
    employeeId: s.employeeId,
    employeeName: emp?.fullName ?? null,
    basicPay: Number(s.basicPay),
    allowances: allowancesObj,
    deductions: deductionsObj,
    grossPay,
    netPay,
    effectiveDate: s.effectiveDate,
    createdAt: s.createdAt.toISOString(),
  });
});

router.patch("/payroll/structures/:id", isHR, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updateData: Record<string, unknown> = {};
  if (req.body.basicPay !== undefined) updateData.basicPay = req.body.basicPay.toString();
  if (req.body.allowances !== undefined) updateData.allowances = req.body.allowances;
  if (req.body.deductions !== undefined) updateData.deductions = req.body.deductions;
  if (req.body.effectiveDate !== undefined) updateData.effectiveDate = req.body.effectiveDate;

  const [s] = await db
    .update(payrollStructuresTable)
    .set(updateData)
    .where(eq(payrollStructuresTable.id, id))
    .returning();

  if (!s) {
    res.status(404).json({ error: "Payroll structure not found" });
    return;
  }

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, s.employeeId));
  const allowancesObj = s.allowances as Record<string, number>;
  const deductionsObj = s.deductions as Record<string, number>;
  const grossPay = Number(s.basicPay) + Object.values(allowancesObj).reduce((a, b) => a + Number(b), 0);
  const netPay = grossPay - Object.values(deductionsObj).reduce((a, b) => a + Number(b), 0);

  res.json({
    id: s.id,
    employeeId: s.employeeId,
    employeeName: emp?.fullName ?? null,
    basicPay: Number(s.basicPay),
    allowances: allowancesObj,
    deductions: deductionsObj,
    grossPay,
    netPay,
    effectiveDate: s.effectiveDate,
    createdAt: s.createdAt.toISOString(),
  });
});

router.get("/payroll/payslips", requireAuth, async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.employeeId) conditions.push(eq(payslipsTable.employeeId, parseInt(req.query.employeeId as string, 10)));
  if (req.query.year) conditions.push(eq(payslipsTable.year, parseInt(req.query.year as string, 10)));
  if (req.query.month) conditions.push(eq(payslipsTable.month, parseInt(req.query.month as string, 10)));

  const payslips = await db
    .select()
    .from(payslipsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(payslipsTable.year, payslipsTable.month);

  const empIds = [...new Set(payslips.map((p) => p.employeeId))];
  const emps = empIds.length > 0
    ? await Promise.all(empIds.map((id) => db.select().from(employeesTable).where(eq(employeesTable.id, id))))
    : [];
  const empMap = new Map(emps.flat().map((e) => [e.id, e.fullName]));

  res.json(
    payslips.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeName: empMap.get(p.employeeId) ?? null,
      month: p.month,
      year: p.year,
      basicPay: Number(p.basicPay),
      allowances: p.allowances,
      deductions: p.deductions,
      grossPay: Number(p.grossPay),
      netPay: Number(p.netPay),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
  );
});

router.post("/payroll/payslips", isHR, async (req, res): Promise<void> => {
  const { employeeId, month, year } = req.body;
  if (!employeeId || !month || !year) {
    res.status(400).json({ error: "employeeId, month, and year are required" });
    return;
  }

  // Get latest structure for this employee
  const [structure] = await db
    .select()
    .from(payrollStructuresTable)
    .where(eq(payrollStructuresTable.employeeId, employeeId))
    .orderBy(payrollStructuresTable.effectiveDate)
    .limit(1);

  if (!structure) {
    res.status(400).json({ error: "No payroll structure found for this employee" });
    return;
  }

  const allowances = structure.allowances as Record<string, number>;
  const deductions = structure.deductions as Record<string, number>;
  const grossPay = Number(structure.basicPay) + Object.values(allowances).reduce((a, b) => a + Number(b), 0);
  const netPay = grossPay - Object.values(deductions).reduce((a, b) => a + Number(b), 0);

  const [payslip] = await db
    .insert(payslipsTable)
    .values({
      employeeId,
      month,
      year,
      basicPay: structure.basicPay,
      allowances,
      deductions,
      grossPay: grossPay.toString(),
      netPay: netPay.toString(),
      status: "draft",
    })
    .returning();

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));

  res.status(201).json({
    id: payslip.id,
    employeeId: payslip.employeeId,
    employeeName: emp?.fullName ?? null,
    month: payslip.month,
    year: payslip.year,
    basicPay: Number(payslip.basicPay),
    allowances: payslip.allowances,
    deductions: payslip.deductions,
    grossPay: Number(payslip.grossPay),
    netPay: Number(payslip.netPay),
    status: payslip.status,
    createdAt: payslip.createdAt.toISOString(),
  });
});

export default router;
