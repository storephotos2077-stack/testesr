import { Router, type IRouter } from "express";
import { eq, and, count, gte, lte, sql } from "drizzle-orm";
import {
  db,
  employeesTable,
  attendanceTable,
  leaveRequestsTable,
  leaveTypesTable,
  leaveBalancesTable,
  holidaysTable,
  profilesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    totalEmps,
    newHires,
    openLeave,
    presentToday,
    onLeaveToday,
    upcomingBirthdays,
  ] = await Promise.all([
    db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.status, "active")),
    db.select({ count: count() }).from(employeesTable).where(
      and(eq(employeesTable.status, "active"), gte(employeesTable.hireDate, monthStart)),
    ),
    db.select({ count: count() }).from(leaveRequestsTable).where(eq(leaveRequestsTable.status, "pending")),
    db.select({ count: count() }).from(attendanceTable).where(
      and(eq(attendanceTable.date, today), eq(attendanceTable.status, "present")),
    ),
    db.select({ count: count() }).from(attendanceTable).where(
      and(eq(attendanceTable.date, today)),
    ),
    db.select({ count: count() }).from(employeesTable).where(
      and(
        eq(employeesTable.status, "active"),
        sql`to_char(${employeesTable.dateOfBirth}::date, 'MM-DD') BETWEEN to_char(now()::date, 'MM-DD') AND to_char((now() + interval '7 days')::date, 'MM-DD')`,
      ),
    ),
  ]);

  res.json({
    totalEmployees: Number(totalEmps[0]?.count ?? 0),
    newHiresThisMonth: Number(newHires[0]?.count ?? 0),
    openLeaveRequests: Number(openLeave[0]?.count ?? 0),
    presentToday: Number(presentToday[0]?.count ?? 0),
    onLeaveToday: Number(onLeaveToday[0]?.count ?? 0),
    upcomingBirthdays: Number(upcomingBirthdays[0]?.count ?? 0),
    upcomingAnniversaries: 0,
  });
});

router.get("/dashboard/my-stats", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.clerkId, req.userId!));

  const employeeId = profile?.employeeId;
  const today = new Date().toISOString().split("T")[0];
  const year = new Date().getFullYear();

  const [todayRecord, balances, upcomingHolidays, pendingLeave] = await Promise.all([
    employeeId
      ? db.select().from(attendanceTable).where(
          and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, today)),
        )
      : Promise.resolve([]),
    employeeId
      ? db.select().from(leaveBalancesTable).where(
          and(eq(leaveBalancesTable.employeeId, employeeId), eq(leaveBalancesTable.year, year)),
        )
      : Promise.resolve([]),
    db.select().from(holidaysTable).where(gte(holidaysTable.date, today)).limit(5),
    employeeId
      ? db.select({ count: count() }).from(leaveRequestsTable).where(
          and(eq(leaveRequestsTable.employeeId, employeeId), eq(leaveRequestsTable.status, "pending")),
        )
      : Promise.resolve([{ count: 0 }]),
  ]);

  const allTypes = await db.select().from(leaveTypesTable);
  const typeMap = new Map(allTypes.map((t) => [t.id, t.name]));

  res.json({
    attendanceStatus: todayRecord[0]?.status ?? null,
    checkIn: todayRecord[0]?.checkIn ?? null,
    checkOut: todayRecord[0]?.checkOut ?? null,
    leaveBalances: balances.map((b) => ({
      id: b.id,
      employeeId: b.employeeId,
      employeeName: null,
      leaveTypeId: b.leaveTypeId,
      leaveTypeName: typeMap.get(b.leaveTypeId) ?? null,
      year: b.year,
      allocated: b.allocated,
      used: b.used,
      remaining: b.allocated - b.used,
    })),
    upcomingHolidays: upcomingHolidays.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
    pendingLeaveRequests: Number((pendingLeave as { count: number | bigint }[])[0]?.count ?? 0),
  });
});

router.get("/dashboard/headcount-by-dept", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      departmentId: employeesTable.departmentId,
      count: count(),
    })
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"))
    .groupBy(employeesTable.departmentId);

  const depts = await db.select().from(sql`departments` as unknown as typeof import("@workspace/db").departmentsTable);

  // Fall back: return plain result
  res.json(
    rows.map((r) => ({
      departmentId: r.departmentId ?? 0,
      departmentName: `Dept ${r.departmentId ?? "Unknown"}`,
      count: Number(r.count),
    })),
  );
});

router.get("/dashboard/leave-trend", requireAuth, async (req, res): Promise<void> => {
  const months = parseInt((req.query.months as string) || "6", 10);
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

    const [total, approved, rejected] = await Promise.all([
      db.select({ count: count() }).from(leaveRequestsTable).where(
        and(gte(leaveRequestsTable.createdAt, new Date(monthStart)), lte(leaveRequestsTable.createdAt, new Date(monthEnd))),
      ),
      db.select({ count: count() }).from(leaveRequestsTable).where(
        and(
          gte(leaveRequestsTable.createdAt, new Date(monthStart)),
          lte(leaveRequestsTable.createdAt, new Date(monthEnd)),
          eq(leaveRequestsTable.status, "approved"),
        ),
      ),
      db.select({ count: count() }).from(leaveRequestsTable).where(
        and(
          gte(leaveRequestsTable.createdAt, new Date(monthStart)),
          lte(leaveRequestsTable.createdAt, new Date(monthEnd)),
          eq(leaveRequestsTable.status, "rejected"),
        ),
      ),
    ]);

    result.push({
      month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      total: Number(total[0]?.count ?? 0),
      approved: Number(approved[0]?.count ?? 0),
      rejected: Number(rejected[0]?.count ?? 0),
      pending: Number(total[0]?.count ?? 0) - Number(approved[0]?.count ?? 0) - Number(rejected[0]?.count ?? 0),
    });
  }

  res.json(result);
});

router.get("/dashboard/upcoming-events", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const weekFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const holidays = await db
    .select()
    .from(holidaysTable)
    .where(and(gte(holidaysTable.date, today), lte(holidaysTable.date, weekFromNow)))
    .limit(10);

  const events = holidays.map((h) => ({
    type: "holiday" as const,
    title: h.name,
    date: h.date,
    employeeId: null,
    employeeName: null,
    avatarUrl: null,
  }));

  // Upcoming work anniversaries
  const employees = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"));

  const now = new Date();
  for (const emp of employees) {
    const hire = new Date(emp.hireDate);
    const anniversary = new Date(now.getFullYear(), hire.getMonth(), hire.getDate());
    if (anniversary >= now && anniversary <= new Date(weekFromNow)) {
      const years = now.getFullYear() - hire.getFullYear();
      events.push({
        type: "anniversary",
        title: `${emp.fullName} — ${years} year${years !== 1 ? "s" : ""} at company`,
        date: anniversary.toISOString().split("T")[0],
        employeeId: emp.id,
        employeeName: emp.fullName,
        avatarUrl: emp.avatarUrl,
      });
    }
    if (emp.dateOfBirth) {
      const bday = new Date(now.getFullYear(), new Date(emp.dateOfBirth).getMonth(), new Date(emp.dateOfBirth).getDate());
      if (bday >= now && bday <= new Date(weekFromNow)) {
        events.push({
          type: "birthday",
          title: `${emp.fullName}'s birthday`,
          date: bday.toISOString().split("T")[0],
          employeeId: emp.id,
          employeeName: emp.fullName,
          avatarUrl: emp.avatarUrl,
        });
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  res.json(events.slice(0, 20));
});

router.get("/dashboard/team-attendance", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const [presentCount, absentCount, wfhCount, onLeaveCount] = await Promise.all([
    db.select({ count: count() }).from(attendanceTable).where(and(eq(attendanceTable.date, today), eq(attendanceTable.status, "present"))),
    db.select({ count: count() }).from(attendanceTable).where(and(eq(attendanceTable.date, today), eq(attendanceTable.status, "absent"))),
    db.select({ count: count() }).from(attendanceTable).where(and(eq(attendanceTable.date, today), eq(attendanceTable.status, "wfh"))),
    db.select({ count: count() }).from(attendanceTable).where(and(eq(attendanceTable.date, today))),
  ]);

  const records = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.date, today))
    .limit(20);

  const totalEmps = await db.select({ count: count() }).from(employeesTable).where(eq(employeesTable.status, "active"));

  const allEmps = await db.select().from(employeesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));

  res.json({
    present: Number(presentCount[0]?.count ?? 0),
    absent: Number(absentCount[0]?.count ?? 0),
    onLeave: Number(onLeaveCount[0]?.count ?? 0),
    wfh: Number(wfhCount[0]?.count ?? 0),
    total: Number(totalEmps[0]?.count ?? 0),
    records: records.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: empMap.get(r.employeeId) ?? null,
      date: r.date,
      status: r.status,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

router.get("/dashboard/pending-approvals", requireAuth, async (_req, res): Promise<void> => {
  const requests = await db
    .select()
    .from(leaveRequestsTable)
    .where(eq(leaveRequestsTable.status, "pending"))
    .orderBy(leaveRequestsTable.createdAt)
    .limit(10);

  const allEmps = await db.select().from(employeesTable);
  const allTypes = await db.select().from(leaveTypesTable);
  const empMap = new Map(allEmps.map((e) => [e.id, e.fullName]));
  const typeMap = new Map(allTypes.map((t) => [t.id, t.name]));

  res.json({
    count: requests.length,
    requests: requests.map((r) => ({
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
      reviewedById: null,
      reviewedByName: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

export default router;
