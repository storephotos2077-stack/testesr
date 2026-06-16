import { useState } from "react";
import { useGetPendingApprovals, useUpdateLeaveRequest, getGetPendingApprovalsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Check, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type ReviewAction = "approved" | "rejected";

interface ReviewState {
  id: number;
  employeeName: string | null | undefined;
  action: ReviewAction;
  notes: string;
}

export default function LeaveApprovalsPage() {
  const { data: pending, isLoading } = useGetPendingApprovals();
  const updateRequest = useUpdateLeaveRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [review, setReview] = useState<ReviewState | null>(null);

  const openReview = (id: number, employeeName: string | null | undefined, action: ReviewAction) => {
    setReview({ id, employeeName, action, notes: "" });
  };

  const handleSubmit = () => {
    if (!review) return;
    updateRequest.mutate(
      { id: review.id, data: { status: review.action, reviewNotes: review.notes || null } },
      {
        onSuccess: () => {
          toast({
            title: review.action === "approved" ? "Leave request approved" : "Leave request rejected",
            variant: review.action === "rejected" ? "destructive" : "default",
          });
          queryClient.invalidateQueries({ queryKey: getGetPendingApprovalsQueryKey() });
          setReview(null);
        },
        onError: () => {
          toast({ title: "Failed to update request", variant: "destructive" });
        },
      },
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div>
          <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Leave Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and manage pending time off requests.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-xl">Pending Requests</CardTitle>
                <CardDescription>Requests awaiting your approval</CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono">{pending?.count || 0} Pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : pending?.requests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8 opacity-20" />
                        <p className="text-sm">No pending requests to review.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pending?.requests?.map((request) => (
                    <TableRow key={request.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="font-medium">{request.employeeName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.leaveTypeName}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {format(new Date(request.startDate), "MMM d")} – {format(new Date(request.endDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{request.totalDays}d</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]" title={request.reason || ""}>
                        {request.reason || <span className="italic">No reason given</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReview(request.id, request.employeeName, "rejected")}
                            disabled={updateRequest.isPending}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openReview(request.id, request.employeeName, "approved")}
                            disabled={updateRequest.isPending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={review !== null} onOpenChange={(open) => !open && setReview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`font-serif text-xl flex items-center gap-2 ${review?.action === "rejected" ? "text-destructive" : "text-primary"}`}>
              {review?.action === "approved" ? (
                <><Check className="h-5 w-5" /> Approve Leave Request</>
              ) : (
                <><X className="h-5 w-5" /> Reject Leave Request</>
              )}
            </DialogTitle>
          </DialogHeader>
          {review && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <span className="font-medium">{review.employeeName}</span>'s leave request will be{" "}
                <span className={review.action === "approved" ? "text-primary font-medium" : "text-destructive font-medium"}>
                  {review.action}
                </span>.
              </div>
              <div className="space-y-1.5">
                <Label>
                  Review Notes{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  placeholder={review.action === "approved"
                    ? "Any instructions or remarks for the employee…"
                    : "Reason for rejection (visible to employee)…"}
                  value={review.notes}
                  onChange={(e) => setReview((r) => r ? { ...r, notes: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setReview(null)}>Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateRequest.isPending}
                  className={review.action === "approved"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                >
                  {updateRequest.isPending
                    ? "Saving…"
                    : review.action === "approved" ? "Approve" : "Reject"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
