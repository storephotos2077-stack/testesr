import { useState } from "react";
import {
  useListLeaveBalances,
  useListLeaveRequests,
  useListLeaveTypes,
  useCreateLeaveRequest,
  useUpdateLeaveRequest,
  useGetMe,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function LeavePage() {
  const currentYear = new Date().getFullYear();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile } = useGetMe();
  const { data: balances, isLoading: isLoadingBalances } = useListLeaveBalances({ year: currentYear });
  const { data: requests, isLoading: isLoadingRequests } = useListLeaveRequests({});
  const { data: leaveTypes } = useListLeaveTypes();

  const createLeave = useCreateLeaveRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listLeaveRequests"] });
        queryClient.invalidateQueries({ queryKey: ["listLeaveBalances"] });
        setDialogOpen(false);
        setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
        toast({ title: "Leave request submitted", description: "Your request is pending approval." });
      },
      onError: () => {
        toast({ title: "Failed to submit request", description: "Please check the dates and try again.", variant: "destructive" });
      },
    },
  });

  const cancelLeave = useUpdateLeaveRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listLeaveRequests"] });
        queryClient.invalidateQueries({ queryKey: ["listLeaveBalances"] });
        setCancelId(null);
        toast({ title: "Leave request cancelled" });
      },
      onError: () => {
        toast({ title: "Failed to cancel request", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.startDate || !form.endDate) return;
    createLeave.mutate({
      data: {
        leaveTypeId: parseInt(form.leaveTypeId),
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || null,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-primary/10 text-primary border-none hover:bg-primary/20">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-none hover:bg-destructive/20">Rejected</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-accent border-accent/50 bg-accent/5">Pending</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Time Off</h1>
            <p className="text-muted-foreground mt-1">Manage your leave balances and requests.</p>
          </div>
          {profile?.employeeId && (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Apply for Leave
            </Button>
          )}
        </div>

        {/* Leave Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoadingBalances ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-5 w-24" /></CardHeader>
                <CardContent><Skeleton className="h-10 w-16 mb-2" /><Skeleton className="h-4 w-32" /></CardContent>
              </Card>
            ))
          ) : balances?.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-muted-foreground border rounded-lg bg-card border-dashed">
              No leave balances found for {currentYear}.
            </div>
          ) : (
            balances?.map((balance) => {
              const used = balance.used ?? 0;
              const allocated = balance.allocated ?? 1;
              const pct = Math.min(100, Math.round((used / allocated) * 100));
              return (
                <Card key={balance.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {balance.leaveTypeName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold font-mono text-foreground">{balance.remaining}</span>
                      <span className="text-sm text-muted-foreground">days remaining</span>
                    </div>
                    <div className="mt-3 w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                      <span>Allocated: <span className="font-mono font-medium text-foreground">{balance.allocated}</span></span>
                      <span>Used: <span className="font-mono font-medium text-foreground">{balance.used}</span></span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Leave History */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Leave History</CardTitle>
            <CardDescription>Your past and upcoming time off requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRequests ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : requests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No leave requests found. They'll show up here once you apply.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.leaveTypeName}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {format(new Date(request.startDate), "MMM d")} – {format(new Date(request.endDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-mono">{request.totalDays}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm truncate max-w-[160px]" title={request.reason || ""}>
                        {request.reason || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => setCancelId(request.id)}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Apply for Leave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Apply for Leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={form.leaveTypeId} onValueChange={(v) => setForm((f) => ({ ...f, leaveTypeId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes?.map((lt) => (
                    <SelectItem key={lt.id} value={String(lt.id)}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Brief description of your leave reason…"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={!form.leaveTypeId || !form.startDate || !form.endDate || createLeave.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createLeave.isPending ? "Submitting…" : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelId !== null} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your pending leave request. The days will be returned to your balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelId && cancelLeave.mutate({ id: cancelId, data: { status: "cancelled" } })}
            >
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
