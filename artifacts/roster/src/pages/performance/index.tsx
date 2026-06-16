import { useState } from "react";
import {
  useListPerformanceReviews,
  useListGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useCreatePerformanceReview,
  useUpdatePerformanceReview,
  useListEmployees,
  useGetMe,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Target, CheckCircle2, Circle, Plus, Pencil, Trash2, Star, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: number;
  title: string;
  description?: string | null;
  targetDate: string;
  progress: number;
  status?: string;
}

const PERIODS = ["Q1", "Q2", "Q3", "Q4", "Annual", "Mid-Year"];

export default function PerformancePage() {
  const { data: reviews, isLoading: isLoadingReviews } = useListPerformanceReviews({});
  const { data: goals, isLoading: isLoadingGoals } = useListGoals({});
  const { data: profile } = useGetMe();
  const { data: employees } = useListEmployees({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isManagerOrAbove = profile?.role === "super_admin" || profile?.role === "hr_admin" || profile?.role === "manager";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState({ title: "", description: "", targetDate: "" });
  const [progressGoal, setProgressGoal] = useState<{ id: number; title: string; progress: number } | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState({
    employeeId: "",
    period: "Q1",
    rating: 3,
    strengths: "",
    improvements: "",
  });

  const createGoal = useCreateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listGoals"] });
        setDialogOpen(false);
        setForm({ title: "", description: "", targetDate: "" });
        toast({ title: "Goal created", description: "Start tracking your progress!" });
      },
      onError: () => {
        toast({ title: "Failed to create goal", variant: "destructive" });
      },
    },
  });

  const updateGoal = useUpdateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listGoals"] });
        setProgressGoal(null);
        setEditGoal(null);
        toast({ title: "Goal updated" });
      },
      onError: () => {
        toast({ title: "Failed to update goal", variant: "destructive" });
      },
    },
  });

  const deleteGoal = useDeleteGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listGoals"] });
        setDeleteGoalId(null);
        toast({ title: "Goal deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete goal", variant: "destructive" });
      },
    },
  });

  const createReview = useCreatePerformanceReview({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listPerformanceReviews"] });
        setReviewDialogOpen(false);
        setReviewForm({ employeeId: "", period: "Q1", rating: 3, strengths: "", improvements: "" });
        toast({ title: "Performance review submitted" });
      },
      onError: () => {
        toast({ title: "Failed to submit review", variant: "destructive" });
      },
    },
  });

  const acknowledgeReview = useUpdatePerformanceReview({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listPerformanceReviews"] });
        toast({ title: "Review acknowledged", description: "Your acknowledgment has been recorded." });
      },
      onError: () => {
        toast({ title: "Failed to acknowledge review", variant: "destructive" });
      },
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.targetDate || !profile?.employeeId) return;
    createGoal.mutate({
      data: {
        employeeId: profile.employeeId,
        title: form.title,
        description: form.description || null,
        targetDate: form.targetDate,
        progress: 0,
      },
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGoal) return;
    updateGoal.mutate({
      id: editGoal.id,
      data: {
        title: editGoal.title,
        description: editGoal.description,
        targetDate: editGoal.targetDate,
        progress: editGoal.progress,
      },
    });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.employeeId) return;
    createReview.mutate({
      data: {
        employeeId: parseInt(reviewForm.employeeId),
        period: reviewForm.period,
        rating: reviewForm.rating,
        strengths: reviewForm.strengths || null,
        improvements: reviewForm.improvements || null,
      },
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Performance</h1>
            <p className="text-muted-foreground mt-1">Your reviews and goals.</p>
          </div>
          <div className="flex gap-2">
            {isManagerOrAbove && (
              <Button variant="outline" onClick={() => setReviewDialogOpen(true)}>
                <ClipboardList className="h-4 w-4 mr-2" /> Write Review
              </Button>
            )}
            {profile?.employeeId && (
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Goal
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> My Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingGoals ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : goals?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                  <Target className="h-10 w-10 opacity-20" />
                  <div>
                    <p className="font-medium text-sm">No goals yet</p>
                    <p className="text-xs mt-1">Add your first goal to start tracking progress.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals?.map((goal) => {
                    const isComplete = goal.progress >= 100;
                    return (
                      <div
                        key={goal.id}
                        className={`p-4 border rounded-lg hover:bg-muted/20 transition-colors group ${isComplete ? "border-primary/30 bg-primary/5" : ""}`}
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h3 className="font-medium leading-tight flex-1" style={{ color: "hsl(152 21% 14%)" }}>
                            {isComplete && <CheckCircle2 className="inline h-4 w-4 text-primary mr-1 -mt-0.5" />}
                            {goal.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="font-mono text-xs">{goal.progress}%</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setProgressGoal({ id: goal.id, title: goal.title, progress: goal.progress })}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeleteGoalId(goal.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{goal.description}</p>
                        )}
                        <div className="w-full bg-muted rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full transition-all ${isComplete ? "bg-primary" : "bg-primary/70"}`}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                          <span>Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}</span>
                          {isComplete && <span className="text-primary font-semibold">Completed!</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Past Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReviews ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : reviews?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                  <CheckCircle2 className="h-10 w-10 opacity-20" />
                  <div>
                    <p className="font-medium text-sm">No reviews yet</p>
                    <p className="text-xs mt-1">Your performance reviews will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews?.map((review) => (
                    <div key={review.id} className="p-4 border rounded-lg bg-muted/10">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium" style={{ color: "hsl(152 21% 14%)" }}>{review.period} Review</h3>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-base ${star <= review.rating ? "text-accent" : "text-muted"}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Reviewed by {review.reviewerName}
                      </div>
                      {(review as any).strengths && (
                        <div className="text-sm mb-1">
                          <span className="font-medium text-primary">Strengths:</span>{" "}
                          <span className="text-muted-foreground">{(review as any).strengths}</span>
                        </div>
                      )}
                      {(review as any).improvements && (
                        <div className="text-sm mb-3">
                          <span className="font-medium text-accent">Areas to improve:</span>{" "}
                          <span className="text-muted-foreground">{(review as any).improvements}</span>
                        </div>
                      )}
                      {review.acknowledged ? (
                        <Badge variant="outline" className="text-primary border-primary/50">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Acknowledged
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <Circle className="h-3 w-3 mr-1" /> Needs Acknowledgment
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs border-primary/50 text-primary hover:bg-primary/10"
                            disabled={acknowledgeReview.isPending}
                            onClick={() => acknowledgeReview.mutate({ id: review.id, data: { acknowledged: true } })}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Add New Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Goal Title</Label>
              <Input
                placeholder="e.g. Complete Q3 OKR project"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Describe the goal and how success will be measured…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={form.targetDate}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={!form.title || !form.targetDate || createGoal.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createGoal.isPending ? "Saving…" : "Save Goal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Write Performance Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Write Performance Review
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReviewSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Employee</Label>
                <Select value={reviewForm.employeeId} onValueChange={(v) => setReviewForm((f) => ({ ...f, employeeId: v }))}>
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
                <Select value={reviewForm.period} onValueChange={(v) => setReviewForm((f) => ({ ...f, period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <div className="flex items-center gap-2 h-10">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                      className={`text-2xl transition-colors ${star <= reviewForm.rating ? "text-accent" : "text-muted hover:text-accent/50"}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-sm text-muted-foreground ml-1 font-mono">{reviewForm.rating}/5</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Strengths <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="What did this employee do well this period?"
                value={reviewForm.strengths}
                onChange={(e) => setReviewForm((f) => ({ ...f, strengths: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Areas for Improvement <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="What can be improved going forward?"
                value={reviewForm.improvements}
                onChange={(e) => setReviewForm((f) => ({ ...f, improvements: e.target.value }))}
                rows={2}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={!reviewForm.employeeId || createReview.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createReview.isPending ? "Submitting…" : "Submit Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Progress Dialog */}
      <Dialog open={!!progressGoal} onOpenChange={(open) => !open && setProgressGoal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Update Progress</DialogTitle>
          </DialogHeader>
          {progressGoal && (
            <div className="space-y-6 py-2">
              <p className="text-sm text-muted-foreground">{progressGoal.title}</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Progress</Label>
                  <span className="font-mono font-bold text-2xl text-primary">{progressGoal.progress}%</span>
                </div>
                <Slider
                  value={[progressGoal.progress]}
                  onValueChange={([v]) => setProgressGoal((g) => g ? { ...g, progress: v } : null)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setProgressGoal(null)}>Cancel</Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={updateGoal.isPending}
                  onClick={() => updateGoal.mutate({ id: progressGoal.id, data: { progress: progressGoal.progress } })}
                >
                  {updateGoal.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editGoal} onOpenChange={(open) => !open && setEditGoal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Goal</DialogTitle>
          </DialogHeader>
          {editGoal && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Goal Title</Label>
                <Input value={editGoal.title} onChange={(e) => setEditGoal((g) => g ? { ...g, title: e.target.value } : null)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={editGoal.description || ""} onChange={(e) => setEditGoal((g) => g ? { ...g, description: e.target.value } : null)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Target Date</Label>
                <Input type="date" value={editGoal.targetDate} onChange={(e) => setEditGoal((g) => g ? { ...g, targetDate: e.target.value } : null)} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditGoal(null)}>Cancel</Button>
                <Button type="submit" disabled={updateGoal.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {updateGoal.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Goal Confirmation */}
      <AlertDialog open={deleteGoalId !== null} onOpenChange={(open) => !open && setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this goal and all its progress. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteGoalId && deleteGoal.mutate({ id: deleteGoalId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
