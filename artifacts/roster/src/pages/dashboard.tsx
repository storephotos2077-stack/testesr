import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useGetMe,
  useGetDashboardStats,
  useGetHeadcountByDept,
  useGetPendingApprovals,
  useGetUpcomingEvents,
  useGetMyStats,
  useListAnnouncements,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RosterStrip } from "@/components/roster-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users,
  CalendarClock,
  FileWarning,
  Gift,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  Plane,
  CalendarDays,
  LogIn,
  Pin,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const DEPT_COLORS = [
  "hsl(138 29% 25%)",
  "hsl(197 30% 42%)",
  "hsl(36 62% 48%)",
  "hsl(6 50% 47%)",
  "hsl(152 21% 14%)",
];

export default function Dashboard() {
  const { data: profile, isLoading: isLoadingProfile } = useGetMe();
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
  const { data: headcount } = useGetHeadcountByDept();
  const { data: pendingApprovals } = useGetPendingApprovals();
  const { data: upcomingEvents } = useGetUpcomingEvents();
  const { data: myStats } = useGetMyStats();
  const { data: announcements } = useListAnnouncements({});

  const isAdmin = profile?.role === "super_admin" || profile?.role === "hr_admin";
  const isManagerOrAbove = isAdmin || profile?.role === "manager";

  // Pinned announcements banner — track dismissed IDs per session
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const pinnedAnnouncements = (announcements ?? [])
    .filter((a) => a.isPinned && !dismissedIds.has(a.id));

  const firstName = profile?.fullName?.split(" ")[0] || "there";

  const kpiCards = [
    {
      label: "Total Headcount",
      value: stats?.totalEmployees ?? 0,
      sub: `+${stats?.newHiresThisMonth ?? 0} this month`,
      icon: Users,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      subColor: "text-primary",
    },
    {
      label: "Present Today",
      value: stats?.presentToday ?? 0,
      sub: `${stats?.onLeaveToday ?? 0} on leave`,
      icon: CalendarClock,
      iconColor: "text-[#4C7A8C]",
      iconBg: "bg-[#4C7A8C]/10",
      subColor: "text-[#4C7A8C]",
    },
    {
      label: "Pending Leaves",
      value: stats?.openLeaveRequests ?? 0,
      sub: "Awaiting review",
      icon: FileWarning,
      iconColor: "text-[#C68A2E]",
      iconBg: "bg-[#C68A2E]/10",
      subColor: "text-[#C68A2E]",
    },
    {
      label: "Upcoming Birthdays",
      value: stats?.upcomingBirthdays ?? 0,
      sub: "Next 30 days",
      icon: Gift,
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
      subColor: "text-destructive",
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">

        {/* ── Pinned Announcements Banner ── */}
        {pinnedAnnouncements.length > 0 && (
          <div className="flex flex-col gap-2 -mb-2">
            {pinnedAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{
                  background: "#fedf89",
                  boxShadow: "rgba(138,133,125,0.2) 0px 1px 4px 0px",
                }}
              >
                <Pin
                  className="h-4 w-4 shrink-0 mt-0.5 rotate-45"
                  style={{ color: "#151b31" }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold mr-2" style={{ color: "#151b31" }}>
                    {ann.title}
                  </span>
                  <span className="text-sm" style={{ color: "#151b31", opacity: 0.8 }}>
                    {ann.content?.slice(0, 120)}{(ann.content?.length ?? 0) > 120 ? "…" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href="/app/announcements">
                    <button
                      className="text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                      style={{ color: "#151b31" }}
                    >
                      Read more
                    </button>
                  </Link>
                  <button
                    className="flex items-center justify-center h-5 w-5 rounded-full hover:opacity-70 transition-opacity"
                    style={{ color: "#151b31" }}
                    onClick={() => setDismissedIds((prev) => new Set([...prev, ann.id]))}
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            {isLoadingProfile ? (
              <Skeleton className="h-9 w-64 mb-2" />
            ) : (
              <h1 className="font-serif text-3xl font-bold tracking-tight" style={{ color: "hsl(152 21% 14%)" }}>
                Good {getTimeOfDay()}, {firstName}
              </h1>
            )}
            <p className="text-muted-foreground mt-1.5 text-sm font-mono">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end gap-1">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Team presence</p>
              <RosterStrip size="sm" count={5} />
            </div>
          </div>
        </div>

        {/* My Stats — shown for all users with an employee profile */}
        {myStats && !isManagerOrAbove && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Today's status */}
            <Card className={`relative overflow-hidden ${myStats.attendanceStatus === "present" ? "border-primary/30" : ""}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-muted-foreground font-medium">Today's Attendance</p>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${myStats.attendanceStatus === "present" ? "bg-primary/10" : "bg-muted"}`}>
                    <LogIn className={`h-4 w-4 ${myStats.attendanceStatus === "present" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                </div>
                <div className="text-xl font-semibold capitalize" style={{ color: "hsl(152 21% 14%)" }}>
                  {myStats.attendanceStatus ?? "Not marked"}
                </div>
                {myStats.checkIn && (
                  <p className="text-xs mt-1 text-muted-foreground font-mono">
                    In: {format(new Date(myStats.checkIn), "h:mm a")}
                    {myStats.checkOut ? ` · Out: ${format(new Date(myStats.checkOut), "h:mm a")}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Leave balances summary */}
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-muted-foreground font-medium">Leave Remaining</p>
                  <div className="h-8 w-8 rounded-lg bg-[#C68A2E]/10 flex items-center justify-center">
                    <Plane className="h-4 w-4 text-[#C68A2E]" />
                  </div>
                </div>
                {myStats.leaveBalances?.length > 0 ? (
                  <div className="space-y-1">
                    {myStats.leaveBalances.slice(0, 3).map((b) => (
                      <div key={b.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">{b.leaveTypeName}</span>
                        <span className="font-mono font-semibold" style={{ color: "hsl(152 21% 14%)" }}>{b.remaining}d</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No balances yet</p>
                )}
              </CardContent>
            </Card>

            {/* Pending leave requests */}
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-muted-foreground font-medium">Pending Requests</p>
                  <div className="h-8 w-8 rounded-lg bg-[#4C7A8C]/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-[#4C7A8C]" />
                  </div>
                </div>
                <div className="text-3xl font-mono font-bold" style={{ color: "hsl(152 21% 14%)" }}>
                  {myStats.pendingLeaveRequests ?? 0}
                </div>
                <p className="text-xs mt-1.5 text-[#4C7A8C] font-medium">Awaiting approval</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* KPI strip — admin/manager only */}
        {isManagerOrAbove && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card, i) =>
              isLoadingStats ? (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ) : (
                <Card key={i} className="relative overflow-hidden">
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                      <div className={`h-8 w-8 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                        <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                      </div>
                    </div>
                    <div className="text-3xl font-mono font-bold" style={{ color: "hsl(152 21% 14%)" }}>
                      {card.value}
                    </div>
                    <p className={`text-xs mt-1.5 font-medium ${card.subColor}`}>{card.sub}</p>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Headcount chart */}
          {isManagerOrAbove && headcount && headcount.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Headcount by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={headcount} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <XAxis
                      dataKey="departmentName"
                      tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        fontFamily: "IBM Plex Mono",
                        borderRadius: 6,
                        border: "1px solid hsl(152 10% 85%)",
                        background: "hsl(75 14% 98%)",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {headcount.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Pending approvals */}
          {isManagerOrAbove && (
            <Card className={headcount && headcount.length > 0 ? "" : "lg:col-span-2"}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-base flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-[#C68A2E]" />
                    Pending Approvals
                  </CardTitle>
                  {pendingApprovals && pendingApprovals.count > 0 && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {pendingApprovals.count}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!pendingApprovals?.requests?.length ? (
                  <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mb-3 opacity-30" />
                    <p className="text-sm font-medium">All clear</p>
                    <p className="text-xs mt-1">No leave requests waiting for review.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingApprovals.requests.slice(0, 5).map((req) => (
                      <div key={req.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium" style={{ color: "hsl(152 21% 14%)" }}>
                            {req.employeeName ?? "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {req.leaveTypeName} · {req.totalDays}d
                          </p>
                        </div>
                        <Link href="/app/leave/approvals">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Review
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {pendingApprovals.count > 5 && (
                      <Link href="/app/leave/approvals">
                        <Button variant="ghost" size="sm" className="w-full text-xs mt-1 h-8">
                          View all {pendingApprovals.count} requests
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#4C7A8C]" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!upcomingEvents?.length ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No events in the next 30 days.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 5).map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {event.type === "holiday" ? (
                          <CalendarClock className="h-3.5 w-3.5 text-primary" />
                        ) : event.type === "birthday" ? (
                          <Gift className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-[#4C7A8C]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "hsl(152 21% 14%)" }}>{event.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="bg-primary border-0 text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-base text-primary-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Mark Attendance", href: "/app/attendance" },
                { label: "Apply for Leave", href: "/app/leave" },
                ...(isManagerOrAbove
                  ? [{ label: "Review Approvals", href: "/app/leave/approvals" }]
                  : []),
                { label: "View Payslips", href: "/app/payroll" },
                { label: "My Goals", href: "/app/performance" },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <button className="w-full text-left px-3 py-2.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-sm font-medium transition-colors flex items-center justify-between group">
                    {action.label}
                    <ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming holidays (from My Stats) */}
          {myStats?.upcomingHolidays && myStats.upcomingHolidays.length > 0 && !isManagerOrAbove && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Upcoming Holidays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myStats.upcomingHolidays.slice(0, 4).map((holiday, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <p className="text-sm font-medium" style={{ color: "hsl(152 21% 14%)" }}>{holiday.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {format(new Date(holiday.date), "MMM d")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
