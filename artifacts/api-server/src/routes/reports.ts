import { Router, type IRouter } from "express";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import {
  db,
  employeesTable,
  leaveRequestsTable,
  leaveTypesTable,
  departmentsTable,
} from "@workspace/db";
import { requireAuth, isHR } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reports/headcount", requireAuth, async (req, res): Promise<void> => {
  const months = parseInt((req.query.months as string) || "12", 10);
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

    const [ct] = await db
      .select({ count: count() })
      .from(employeesTable)
      .where(lte(employeesTable.hireDate, monthEnd));

    result.push({
      month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      count: Number(ct?.count ?? 0),
    });
  }

  res.json(result);
});

router.get("/reports/leave-utilization", requireAuth, async (req, res): Promise<void> => {
  const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const leaveTypes = await db.select().from(leaveTypesTable);
  const depts = await db.select().from(departmentsTable);
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));

  const result = await Promise.all(
    leaveTypes.map(async (lt) => {
      const requests = await db
        .select()
        .from(leaveRequestsTable)
        .where(
          and(
            eq(leaveRequestsTable.leaveTypeId, lt.id),
            eq(leaveRequestsTable.status, "approved"),
            gte(leaveRequestsTable.startDate, yearStart),
            lte(leaveRequestsTable.endDate, yearEnd),
          ),
        );

      const byDeptMap = new Map<number, number>();
      for (const r of requests) {
        const empRows = await db
          .select({ departmentId: employeesTable.departmentId })
          .from(employeesTable)
          .where(eq(employeesTable.id, r.employeeId));
        const deptId = empRows[0]?.departmentId;
        if (deptId) {
          byDeptMap.set(deptId, (byDeptMap.get(deptId) ?? 0) + Number(r.totalDays));
        }
      }

      const totalDays = requests.reduce((sum, r) => sum + Number(r.totalDays), 0);

      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        totalDays,
        byDepartment: Array.from(byDeptMap.entries()).map(([deptId, days]) => ({
          departmentName: deptMap.get(deptId) ?? `Dept ${deptId}`,
          days,
        })),
      };
    }),
  );

  res.json(result);
});

export default router;
