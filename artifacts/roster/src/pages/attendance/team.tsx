import { useState } from "react";
import {
  useGetTeamAttendance,
  useMarkAttendance,
  useListEmployees,
  useGetMe,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Users, Search, CheckCircle2, XCircle, Coffee, Home, Clock, ClipboardEdit } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: typeof CheckCircle2; color: string }> = {
  present:  { label: "Present",  badge: "bg-primary/10 text-primary border-none hover:bg-primary/20",       icon: CheckCircle2, color: "text-primary" },
  absent:   { label: "Absent",   badge: "bg-destructive/10 text-destructive border-none hover:bg-destructive/20", icon: XCircle,      color: "text-destructive" },
  wfh:      { label: "WFH",      badge: "text-accent border-accent/50 bg-accent/5",                           icon: Home,         color: "text-accent" },
  half_day: { label: "Half Day", badge: "",                                                                    icon: Coffee,       color: "text-muted-foreground" },
  late:     { label: "Late",     badge: "text-orange-600 border-orange-200",                                   icon: Clock,        color: "text-orange-500" },
};

const STATUSES = ["present", "absent", "wfh", "half_day", "late"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, badge: "", icon: CheckCircle2, color: "" };
  return (
    <Badge variant="outline" className={cfg.badge}>
      {cfg.label}
    </Badge>
  );
}

export default function TeamAttendancePage() {
  const { data: teamAttendance, isLoading } = useGetTeamAttendance();
  const { data: profile } = useGetMe();
  const { data: employees } = useListEmployees({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [markDialog, setMarkDialog] = useState(false);
  const [markForm, setMarkForm] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    status: "present",
    checkIn: "",
    checkOut: "",
    notes: "",
  });

  const isHR = profile?.role === "super_admin" || profile?.role === "hr_admin";

  const markAttendance = useMarkAttendance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getTeamAttendance"] });
        queryClient.invalidateQueries({ queryKey: ["listAttendance"] });
        setMarkDialog(false);
        setMarkForm({ employeeId: "", date: format(new Date(), "yyyy-MM-dd"), status: "present", checkIn: "", checkOut: "", notes: "" });
        toast({ title: "Attendance marked", description: "The record has been saved." });
      },
      onError: () => {
        toast({ title: "Failed to mark attendance", variant: "destructive" });
      },
    },
  });

  const handleMarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!markForm.employeeId) return;
    markAttendance.mutate({
      data: {
        employeeId: parseInt(markForm.employeeId),
        date: markForm.date,
        status: markForm.status,
        checkIn: markForm.checkIn ? `${markForm.date}T${markForm.checkIn}:00` : null,
        checkOut: markForm.checkOut ? `${markForm.date}T${markForm.checkOut}:00` : null,
        notes: markForm.notes || null,
      },
    });
  };

  const records = teamAttendance?.records ?? [];
  const filtered = search
    ? records.filter((r) => r.employeeName?.toLowerCase().includes(search.toLowerCase()))
    : records;

  const total = records.length;
  const presentRate = total > 0 ? Math.round(((teamAttendance?.present ?? 0) / total) * 100) : 0;

  const summaryCards = [
    { label: "Present", value: teamAttendance?.present ?? 0, colorClass: "text-primary", bgClass: "bg-primary/10", icon: CheckCircle2 },
    { label: "Absent",  value: teamAttendance?.absent  ?? 0, colorClass: "text-destructive", bgClass: "bg-destructive/10", icon: XCircle },
    { label: "On Leave",value: teamAttendance?.onLeave ?? 0, colorClass: "text-accent", bgClass: "bg-accent/10", icon: Coffee },
    { label: "WFH",     value: teamAttendance?.wfh     ?? 0, colorClass: "text-sidebar", bgClass: "bg-muted", icon: Home },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Team Attendance</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 font-mono text-sm">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">{presentRate}% present today</span>
              </div>
            )}
            {isHR && (
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setMarkDialog(true)}>
                <ClipboardEdit className="h-4 w-4 mr-2" /> Mark Attendance
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{card.label}</div>
                  <div className={`h-8 w-8 rounded-lg ${card.bgClass} flex items-center justify-center`}>
                    <card.icon className={`h-4 w-4 ${card.colorClass}`} />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className={`text-3xl font-bold font-mono ${card.colorClass}`}>{card.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Presence bar */}
        {!isLoading && total > 0 && (
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span>Presence rate</span>
              <span className="font-semibold text-foreground">{presentRate}% · {teamAttendance?.present ?? 0}/{total}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
              {[
                { key: "present", val: teamAttendance?.present ?? 0, color: "bg-primary" },
                { key: "wfh",     val: teamAttendance?.wfh     ?? 0, color: "bg-accent" },
                { key: "onLeave", val: teamAttendance?.onLeave ?? 0, color: "bg-amber-400" },
                { key: "absent",  val: teamAttendance?.absent  ?? 0, color: "bg-destructive/60" },
              ].map((seg) => (
                <div
                  key={seg.key}
                  className={`${seg.color} h-2 transition-all`}
                  style={{ width: `${(seg.val / total) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: "Present", color: "bg-primary" },
                { label: "WFH", color: "bg-accent" },
                { label: "Leave", color: "bg-amber-400" },
                { label: "Absent", color: "bg-destructive/60" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className={`h-2 w-2 rounded-full ${l.color}`} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <CardTitle className="font-serif">Today's Roster</CardTitle>
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search employee…"
                className="pl-9 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-28" /></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {search ? `No employees matching "${search}".` : "No attendance records found for today."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((record) => {
                    const hoursWorked = record.checkIn && record.checkOut
                      ? ((new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60)).toFixed(1)
                      : null;
                    return (
                      <TableRow key={record.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0 overflow-hidden">
                              {record.employeeName?.charAt(0)}
                            </div>
                            <span className="font-medium">{record.employeeName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.checkIn ? format(new Date(record.checkIn), "h:mm a") : "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{record.checkOut ? format(new Date(record.checkOut), "h:mm a") : "-"}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{hoursWorked ? `${hoursWorked}h` : "-"}</TableCell>
                        <TableCell><StatusBadge status={record.status} /></TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {filtered.length > 0 && (
              <div className="mt-3 text-xs font-mono text-muted-foreground">
                Showing {filtered.length} of {total} employees
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark Attendance Dialog */}
      <Dialog open={markDialog} onOpenChange={setMarkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <ClipboardEdit className="h-5 w-5 text-primary" /> Mark Attendance
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={markForm.employeeId} onValueChange={(v) => setMarkForm((f) => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees?.data?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={markForm.date}
                  onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={markForm.status} onValueChange={(v) => setMarkForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s]?.label ?? s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(markForm.status === "present" || markForm.status === "late" || markForm.status === "half_day") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Check In <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    type="time"
                    value={markForm.checkIn}
                    onChange={(e) => setMarkForm((f) => ({ ...f, checkIn: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Check Out <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    type="time"
                    value={markForm.checkOut}
                    onChange={(e) => setMarkForm((f) => ({ ...f, checkOut: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Any notes about this attendance record…"
                value={markForm.notes}
                onChange={(e) => setMarkForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMarkDialog(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={!markForm.employeeId || markAttendance.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {markAttendance.isPending ? "Saving…" : "Save Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
