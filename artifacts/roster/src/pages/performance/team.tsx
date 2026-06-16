import { useState } from "react";
import {
  useListPerformanceReviews,
  useCreatePerformanceReview,
  useUpdatePerformanceReview,
  useListEmployees,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Star, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type ReviewItem = {
  id: number;
  employeeName?: string | null;
  employeeId?: number | null;
  period: string;
  rating: number;
  strengths?: string | null;
  improvements?: string | null;
  acknowledged?: boolean | null;
};

export default function TeamPerformancePage() {
  const { data: reviews, isLoading } = useListPerformanceReviews({});
  const { data: employees } = useListEmployees({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Create ────────────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    rating: "3",
    period: "",
    strengths: "",
    improvements: "",
  });

  const createReview = useCreatePerformanceReview({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listPerformanceReviews"] });
        setDialogOpen(false);
        setForm({ employeeId: "", rating: "3", period: "", strengths: "", improvements: "" });
        toast({ title: "Review submitted", description: "The employee will be notified." });
      },
      onError: () => {
        toast({ title: "Failed to submit review", variant: "destructive" });
      },
    },
  });

  // ── Edit ──────────────────────────────────────────────────────────────────
  const [editItem, setEditItem] = useState<{
    id: number;
    rating: string;
    period: string;
    strengths: string;
    improvements: string;
  } | null>(null);

  const updateReview = useUpdatePerformanceReview({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listPerformanceReviews"] });
        setEditItem(null);
        toast({ title: "Review updated" });
      },
      onError: () => {
        toast({ title: "Failed to update review", variant: "destructive" });
      },
    },
  });

  const openEdit = (review: ReviewItem) => {
    setEditItem({
      id: review.id,
      rating: String(review.rating),
      period: review.period,
      strengths: review.strengths ?? "",
      improvements: review.improvements ?? "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.period) return;
    createReview.mutate({
      data: {
        employeeId: parseInt(form.employeeId),
        rating: parseInt(form.rating),
        period: form.period,
        strengths: form.strengths || null,
        improvements: form.improvements || null,
      },
    });
  };

  const ratingColor = (r: number) => {
    if (r >= 4) return "text-primary font-semibold";
    if (r >= 3) return "text-foreground";
    return "text-destructive";
  };

  const avgRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const acknowledgedCount = reviews?.filter((r) => r.acknowledged).length ?? 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Team Performance</h1>
            <p className="text-muted-foreground mt-1">Submit reviews and track goals for your direct reports.</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Review
          </Button>
        </div>

        {/* Summary stats */}
        {reviews && reviews.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Reviews</p>
                <div className="text-3xl font-mono font-bold text-sidebar">{reviews.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm text-muted-foreground font-medium mb-1">Avg Rating</p>
                <div className="text-3xl font-mono font-bold text-sidebar flex items-baseline gap-1">
                  {avgRating}
                  <span className="text-sm text-muted-foreground font-normal">/5</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-sm text-muted-foreground font-medium mb-1">Acknowledged</p>
                <div className="text-3xl font-mono font-bold text-sidebar">
                  {acknowledgedCount}
                  <span className="text-sm text-muted-foreground font-normal">/{reviews.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Review History</CardTitle>
            <CardDescription>All submitted performance reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Strengths</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : reviews?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No reviews yet. Submit your first review above.
                    </TableCell>
                  </TableRow>
                ) : (
                  (reviews as ReviewItem[])?.map((review) => (
                    <TableRow key={review.id} className="group">
                      <TableCell className="font-medium">{review.employeeName}</TableCell>
                      <TableCell className="text-muted-foreground">{review.period}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${ratingColor(review.rating)}`}>
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span>{review.rating}/5</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">{review.strengths || "—"}</p>
                      </TableCell>
                      <TableCell>
                        {review.acknowledged ? (
                          <Badge variant="outline" className="text-primary border-primary/50 bg-primary/5">Acknowledged</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openEdit(review)}
                          title="Edit review"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* New Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">New Performance Review</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees?.data?.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Period</Label>
                <Input placeholder="e.g. Q2 2025" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Overall Rating (1–5)</Label>
              <Select value={form.rating} onValueChange={(v) => setForm((f) => ({ ...f, rating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 — Exceptional</SelectItem>
                  <SelectItem value="4">4 — Exceeds Expectations</SelectItem>
                  <SelectItem value="3">3 — Meets Expectations</SelectItem>
                  <SelectItem value="2">2 — Needs Improvement</SelectItem>
                  <SelectItem value="1">1 — Unsatisfactory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Strengths <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea placeholder="What did this employee do well?" rows={2} value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Areas to Improve <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea placeholder="What could be better next period?" rows={2} value={form.improvements} onChange={(e) => setForm((f) => ({ ...f, improvements: e.target.value }))} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.employeeId || !form.period || createReview.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {createReview.isPending ? "Submitting…" : "Submit Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Review Dialog */}
      <Dialog open={editItem !== null} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Performance Review</DialogTitle>
          </DialogHeader>
          {editItem && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateReview.mutate({
                  id: editItem.id,
                  data: {
                    rating: parseInt(editItem.rating),
                    strengths: editItem.strengths || null,
                    improvements: editItem.improvements || null,
                  },
                });
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label>Period</Label>
                <Input value={editItem.period} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-1.5">
                <Label>Overall Rating (1–5)</Label>
                <Select value={editItem.rating} onValueChange={(v) => setEditItem((ei) => ei ? { ...ei, rating: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 — Exceptional</SelectItem>
                    <SelectItem value="4">4 — Exceeds Expectations</SelectItem>
                    <SelectItem value="3">3 — Meets Expectations</SelectItem>
                    <SelectItem value="2">2 — Needs Improvement</SelectItem>
                    <SelectItem value="1">1 — Unsatisfactory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Strengths <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea rows={2} value={editItem.strengths} onChange={(e) => setEditItem((ei) => ei ? { ...ei, strengths: e.target.value } : null)} />
              </div>
              <div className="space-y-1.5">
                <Label>Areas to Improve <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea rows={2} value={editItem.improvements} onChange={(e) => setEditItem((ei) => ei ? { ...ei, improvements: e.target.value } : null)} />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={updateReview.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {updateReview.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
