import { useState } from "react";
import {
  useListAttendance,
  useCheckIn,
  useCheckOut,
  useGetMe,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LogIn, LogOut, Clock, CheckCircle2, CalendarDays, TrendingUp } from "lucide-react";

export default function AttendancePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile } = useGetMe();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Load all records for current month for summary stats
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const { data: monthAttendance } = useListAttendance({ startDate: monthStart, endDate: monthEnd });

  const { data: attendance, isLoading } = useListAttendance({
    date: date ? format(date, "yyyy-MM-dd") : undefined,
  });
  const { data: todayRecords, isLoading: isLoadingToday } = useListAttendance({ date: todayStr });

  const checkIn = useCheckIn({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listAttendance"] });
        toast({ title: "Checked in", description: "Your attendance has been recorded." });
      },
      onError: () => {
        toast({ title: "Check-in failed", description: "Please try again.", variant: "destructive" });
      },
    },
  });

  const checkOut = useCheckOut({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listAttendance"] });
        toast({ title: "Checked out", description: "Have a great rest of your day!" });
      },
      onError: () => {
        toast({ title: "Check-out failed", description: "Please try again.", variant: "destructive" });
      },
    },
  });

  const employeeId = profile?.employeeId;
  const todayRecord = todayRecords?.find((r) => r.employeeId === employeeId);

  const handleCheckIn = () => {
    if (!employeeId) return;
    checkIn.mutate({ data: { employeeId } });
  };

  const handleCheckOut = () => {
    if (!employeeId) return;
    checkOut.mutate({ data: { employeeId } });
  };

  const hasCheckedIn = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;

  // Compute month stats from my own records
  const myMonthRecords = monthAttendance?.filter((r) => r.employeeId === employeeId) ?? [];
  const presentDays = myMonthRecords.filter((r) => r.status === "present" || r.status === "wfh").length;
  const absentDays = myMonthRecords.filter((r) => r.status === "absent").length;
  const wfhDays = myMonthRecords.filter((r) => r.status === "wfh").length;
  const totalMarked = myMonthRecords.length;
  const attendanceRate = totalMarked > 0 ? Math.round((presentDays / totalMarked) * 100) : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">Present</Badge>;
      case "absent":
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none">Absent</Badge>;
      case "wfh":
        return <Badge variant="outline" className="text-accent border-accent/50">WFH</Badge>;
      case "half_day":
        return <Badge variant="secondary">Half Day</Badge>;
      case "late":
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Late</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calcDuration = (checkInStr?: string | null, checkOutStr?: string | null) => {
    if (!checkInStr || !checkOutStr) return null;
    const diff = new Date(checkOutStr).getTime() - new Date(checkInStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Attendance</h1>
            <p className="text-muted-foreground mt-1">View and manage your attendance records.</p>
          </div>
        </div>

        {/* Today's status card */}
        {employeeId && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 pb-5">
              {isLoadingToday ? (
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-48" />
                  <Skeleton className="h-16 w-48" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${hasCheckedIn ? "bg-primary/20" : "bg-muted"}`}>
                      <Clock className={`h-6 w-6 ${hasCheckedIn ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Today — {format(new Date(), "EEEE, MMMM d")}</p>
                      {!hasCheckedIn && !hasCheckedOut && (
                        <p className="font-semibold text-foreground">Not checked in yet</p>
                      )}
                      {hasCheckedIn && !hasCheckedOut && (
                        <p className="font-semibold text-primary">
                          Checked in at {format(new Date(todayRecord!.checkIn!), "h:mm a")}
                        </p>
                      )}
                      {hasCheckedIn && hasCheckedOut && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <p className="font-semibold text-primary">
                            {format(new Date(todayRecord!.checkIn!), "h:mm a")} → {format(new Date(todayRecord!.checkOut!), "h:mm a")}
                            {calcDuration(todayRecord!.checkIn, todayRecord!.checkOut) && (
                              <span className="text-muted-foreground font-normal text-sm ml-2">
                                ({calcDuration(todayRecord!.checkIn, todayRecord!.checkOut)})
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCheckIn}
                      disabled={hasCheckedIn || checkIn.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      {checkIn.isPending ? "Checking in…" : "Check In"}
                    </Button>
                    <Button
                      onClick={handleCheckOut}
                      disabled={!hasCheckedIn || hasCheckedOut || checkOut.isPending}
                      variant="outline"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {checkOut.isPending ? "Checking out…" : "Check Out"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Monthly stats strip */}
        {employeeId && myMonthRecords.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">This Month</p>
                </div>
                <div className="text-2xl font-mono font-bold text-sidebar">{totalMarked}
                  <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Attendance Rate</p>
                </div>
                <div className="text-2xl font-mono font-bold text-primary">{attendanceRate ?? "—"}
                  {attendanceRate != null && <span className="text-sm font-normal text-muted-foreground ml-0.5">%</span>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">WFH Days</p>
                <div className="text-2xl font-mono font-bold text-accent">{wfhDays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Absent Days</p>
                <div className="text-2xl font-mono font-bold text-destructive">{absentDays}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-serif">Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="font-serif">
                Records for {date ? format(date, "MMMM yyyy") : "Selected Period"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      </TableRow>
                    ))
                  ) : attendance?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No attendance records found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendance?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-sm">{format(new Date(record.date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.checkIn ? format(new Date(record.checkIn), "h:mm a") : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.checkOut ? format(new Date(record.checkOut), "h:mm a") : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {calcDuration(record.checkIn, record.checkOut) ?? "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{record.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
