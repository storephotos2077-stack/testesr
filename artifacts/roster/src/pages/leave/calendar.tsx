import { useState } from "react";
import { useGetLeaveCalendar } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInCalendarDays } from "date-fns";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

export default function LeaveCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const startDate = startOfMonth(currentMonth).toISOString();
  const endDate = endOfMonth(currentMonth).toISOString();

  const { data: calendarEvents, isLoading } = useGetLeaveCalendar({ startDate, endDate });

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  const totalDays = (calendarEvents ?? []).reduce((acc, e) => {
    const days = differenceInCalendarDays(new Date(e.endDate), new Date(e.startDate)) + 1;
    return acc + days;
  }, 0);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Team Leave Calendar</h1>
            <p className="text-muted-foreground mt-1">See who is out of the office and when.</p>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2 border border-border rounded-lg p-1 bg-card">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-mono text-sm font-medium w-36 text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-primary">{calendarEvents?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Employees on leave</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <span className="text-accent font-bold text-sm font-mono">{totalDays}</span>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-accent">{totalDays}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Total leave days</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Leave Schedule</CardTitle>
            <CardDescription>{format(currentMonth, "MMMM yyyy")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : calendarEvents?.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border rounded-lg border-dashed">
                <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nobody is on leave in {format(currentMonth, "MMMM")}</p>
                <p className="text-sm mt-1">Everyone is in the office this month.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calendarEvents?.map((event, i) => {
                  const days = differenceInCalendarDays(new Date(event.endDate), new Date(event.startDate)) + 1;
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0 overflow-hidden">
                        {event.avatarUrl ? (
                          <img src={event.avatarUrl} alt={event.employeeName} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          event.employeeName.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{event.employeeName}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {format(new Date(event.startDate), "MMM d")}
                          {" → "}
                          {format(new Date(event.endDate), "MMM d, yyyy")}
                          {" · "}
                          <span className="text-foreground">{days}d</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">{event.leaveType}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
