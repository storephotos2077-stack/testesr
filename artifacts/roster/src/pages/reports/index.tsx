import {
  useGetHeadcountReport,
  useGetLeaveUtilizationReport,
  useGetLeaveTrend,
  useGetDashboardStats,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Download, Users, CalendarCheck, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

function downloadCsv(filename: string, rows: (string | number)[][], headers: string[]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { data: headcountData, isLoading: isLoadingHeadcount } = useGetHeadcountReport({ months: 6 });
  const { data: leaveData, isLoading: isLoadingLeave } = useGetLeaveUtilizationReport({});
  const { data: trendData, isLoading: isLoadingTrend } = useGetLeaveTrend({ months: 6 });
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();

  const latestHeadcount = headcountData?.[headcountData.length - 1]?.count ?? null;
  const totalLeaveDays = leaveData?.reduce((s, r) => s + r.totalDays, 0) ?? null;
  const lastMonthTrend = trendData?.[trendData.length - 1];
  const leaveApprovalRate =
    lastMonthTrend && lastMonthTrend.total > 0
      ? Math.round((lastMonthTrend.approved / lastMonthTrend.total) * 100)
      : null;

  const kpis = [
    {
      label: "Current Headcount",
      value: stats?.totalEmployees ?? latestHeadcount,
      sub: `+${stats?.newHiresThisMonth ?? 0} this month`,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Leave Days (Period)",
      value: totalLeaveDays,
      sub: "All leave types combined",
      icon: CalendarCheck,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Open Requests",
      value: stats?.openLeaveRequests ?? null,
      sub: "Pending approval",
      icon: Clock,
      color: "text-[#C68A2E]",
      bg: "bg-[#C68A2E]/10",
    },
    {
      label: "Approval Rate",
      value: leaveApprovalRate != null ? `${leaveApprovalRate}%` : null,
      sub: "Last month approved",
      icon: TrendingUp,
      color: "text-[#4C7A8C]",
      bg: "bg-[#4C7A8C]/10",
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div>
          <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and insights for your organization.</p>
        </div>

        {/* KPI summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) =>
            isLoadingStats && isLoadingHeadcount ? (
              <Card key={i}>
                <CardContent className="pt-6"><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-4 w-24" /></CardContent>
              </Card>
            ) : (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="pt-6 pb-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
                    <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                  </div>
                  <div className={`text-3xl font-mono font-bold ${kpi.color}`}>
                    {kpi.value ?? "—"}
                  </div>
                  <p className="text-xs mt-1.5 text-muted-foreground font-medium">{kpi.sub}</p>
                </CardContent>
              </Card>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Headcount Trend */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="font-serif text-xl">Headcount Trend</CardTitle>
                <CardDescription>Total employees over the last 6 months</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                disabled={!headcountData?.length}
                title="Download CSV"
                onClick={() =>
                  headcountData &&
                  downloadCsv(
                    `headcount-trend-${format(new Date(), "yyyy-MM-dd")}.csv`,
                    headcountData.map((r) => [r.month, r.count]),
                    ["Month", "Count"],
                  )
                }
              >
                <Download className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingHeadcount ? (
                <Skeleton className="h-[300px] w-full" />
              ) : !headcountData?.length ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No headcount data yet.
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={headcountData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Line type="monotone" dataKey="count" name="Employees" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Utilization */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="font-serif text-xl">Leave Utilization</CardTitle>
                <CardDescription>Total days taken by leave type</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                disabled={!leaveData?.length}
                title="Download CSV"
                onClick={() =>
                  leaveData &&
                  downloadCsv(
                    `leave-utilization-${format(new Date(), "yyyy-MM-dd")}.csv`,
                    leaveData.map((r) => [r.leaveTypeName, r.totalDays]),
                    ["Leave Type", "Total Days"],
                  )
                }
              >
                <Download className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingLeave ? (
                <Skeleton className="h-[300px] w-full" />
              ) : !leaveData?.length ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No leave data yet.
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="leaveTypeName" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                        formatter={(v) => [`${v} days`, "Total"]}
                      />
                      <Bar dataKey="totalDays" name="Days" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Trend — full width */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="font-serif text-xl">Leave Requests Trend</CardTitle>
                <CardDescription>Approved, pending, and rejected requests over the last 6 months</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                disabled={!trendData?.length}
                title="Download CSV"
                onClick={() =>
                  trendData &&
                  downloadCsv(
                    `leave-trend-${format(new Date(), "yyyy-MM-dd")}.csv`,
                    trendData.map((r) => [r.month, r.total, r.approved, r.pending ?? 0, r.rejected]),
                    ["Month", "Total", "Approved", "Pending", "Rejected"],
                  )
                }
              >
                <Download className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingTrend ? (
                <Skeleton className="h-[280px] w-full" />
              ) : !trendData?.length ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No leave data available yet.
                </div>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="approved" name="Approved" fill="hsl(138 29% 40%)" radius={[2, 2, 0, 0]} stackId="a" />
                      <Bar dataKey="pending" name="Pending" fill="hsl(36 62% 55%)" radius={[0, 0, 0, 0]} stackId="a" />
                      <Bar dataKey="rejected" name="Rejected" fill="hsl(6 50% 55%)" radius={[2, 2, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
