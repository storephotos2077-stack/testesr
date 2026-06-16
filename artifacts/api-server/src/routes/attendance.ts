import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, attendanceTable, employeesTable } from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

function formatRecord(r: typeof attendanceTable.$inferSelect, employeeName?: string | null) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    employeeName: employeeName ?? null,
    date: r.date,
    status: r.status,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.employeeId) conditions.push(eq(attendanceTable.employeeId, parseInt(req.query.employeeId as string, 10)));
  if (req.query.date) conditions.push(eq(attendanceTable.date, req.query.date as string));
  if (req.query.startDate) conditions.push(gte(attendanceTable.date, req.query.startDate as string));
  if (req.query.endDate) conditions.push(lte(attendanceTable.date, req.query.endDate as string));

  const records = await db
    .select()
    .from(attendanceTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(attendanceTable.date);

  const empIds = [...new Set(records.map((r) => r.employeeId))];
  const employees = empIds.length
    ? await db.select().from(employeesTable).where(eq(employeesTable.id, empIds[0]))
    : [];

  // Fetch all needed employees
  const allEmps = empIds.length > 0
    ? await Promise.all(empIds.map((id) => db.select().from(employeesTable).where(eq(employeesTable.id, id))))
    : [];
  const empMap = new Map(allEmps.flat().map((e) => [e.id, e.fullName]));

  res.json(records.map((r) => formatRecord(r, empMap.get(r.employeeId))));
});

router.get("/attendance/today", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const records = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.date, today));

  const empIds = [...new Set(records.map((r) => r.employeeId))];
  const allEmps = empIds.length > 0
    ? await Promise.all(empIds.map((id) => db.select().from(employeesTable).where(eq(employeesTable.id, id))))
    : [];
  const empMap = new Map(allEmps.flat().map((e) => [e.id, e.fullName]));

  res.json(records.map((r) => formatRecord(r, empMap.get(r.employeeId))));
});

router.post("/attendance", requireAuth, async (req, res): Promise<void> => {
  const { employeeId, date, status, checkIn, checkOut, notes } = req.body;
  if (!employeeId || !date || !status) {
    res.status(400).json({ error: "employeeId, date, and status are required" });
    return;
  }

  const [record] = await db
    .insert(attendanceTable)
    .values({ employeeId, date, status, checkIn, checkOut, notes })
    .returning();

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
  res.status(201).json(formatRecord(record, emp?.fullName));
});

router.post("/attendance/check-in", requireAuth, async (req, res): Promise<void> => {
  const { employeeId, notes } = req.body;
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [existing] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, today)));

  let record;
  if (existing) {
    [record] = await db
      .update(attendanceTable)
      .set({ checkIn: now, status: "present" })
      .where(eq(attendanceTable.id, existing.id))
      .returning();
  } else {
    [record] = await db
      .insert(attendanceTable)
      .values({ employeeId, date: today, status: "present", checkIn: now, notes })
      .returning();
  }

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
  res.json(formatRecord(record, emp?.fullName));
});

router.post("/attendance/check-out", requireAuth, async (req, res): Promise<void> => {
  const { employeeId, notes } = req.body;
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [existing] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, today)));

  if (!existing) {
    res.status(404).json({ error: "No check-in record found for today" });
    return;
  }

  const [record] = await db
    .update(attendanceTable)
    .set({ checkOut: now })
    .where(eq(attendanceTable.id, existing.id))
    .returning();

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
  res.json(formatRecord(record, emp?.fullName));
});

export default router;
