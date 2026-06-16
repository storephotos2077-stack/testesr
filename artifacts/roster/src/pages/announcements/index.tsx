import { useState } from "react";
import {
  useListAnnouncements,
  useGetMe,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useListDepartments,
  useMarkAnnouncementSeen,
  useGetAnnouncementReads,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Pin, Plus, Megaphone, Trash2, Pencil, CheckCircle2, Eye, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type AnnouncementItem = {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  departmentId?: number | null;
  departmentName?: string | null;
  postedByName?: string | null;
  createdAt: string;
  seenByMe?: boolean;
  seenCount?: number;
};

function ReadReceiptsDialog({
  announcementId,
  announcementTitle,
  open,
  onClose,
}: {
  announcementId: number;
  announcementTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: reads, isLoading } = useGetAnnouncementReads(announcementId, {
    query: { enabled: open && announcementId > 0 },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Read Receipts
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{announcementTitle}</p>
        </DialogHeader>
        <div className="mt-2">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : reads && reads.length > 0 ? (
            <ScrollArea className="max-h-72">
              <div className="space-y-1 pr-2">
                {reads.map((r, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(r.fullName ?? r.email ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {r.fullName ?? r.email ?? "Unknown"}
                        </p>
                        {r.email && r.fullName && (
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground font-mono">
                          {format(new Date(r.seenAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    {idx < reads.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mb-3">
                <Eye className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-sm font-medium text-foreground">No reads yet</p>
              <p className="text-xs mt-1">
                No one has marked this announcement as seen yet.
              </p>
            </div>
          )}
          {reads && reads.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {reads.length} {reads.length === 1 ? "person has" : "people have"} seen this
              announcement
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AnnouncementsPage() {
  const { data: announcements, isLoading } = useListAnnouncements({});
  const { data: profile } = useGetMe();
  const { data: departments } = useListDepartments();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isHR = profile?.role === "super_admin" || profile?.role === "hr_admin";

  // ── Mark as seen ──────────────────────────────────────────────────────────
  const markSeen = useMarkAnnouncementSeen({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listAnnouncements"] });
      },
    },
  });

  // ── Read receipts dialog ──────────────────────────────────────────────────
  const [receiptsAnn, setReceiptsAnn] = useState<{ id: number; title: string } | null>(null);

  // ── Create ────────────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    departmentId: "",
    isPinned: false,
  });

  const createAnnouncement = useCreateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listAnnouncements"] });
        setDialogOpen(false);
        setForm({ title: "", content: "", departmentId: "", isPinned: false });
        toast({ title: "Announcement posted", description: "All relevant employees will see it." });
      },
      onError: () => {
        toast({ title: "Failed to post announcement", variant: "destructive" });
      },
    },
  });

  // ── Edit ──────────────────────────────────────────────────────────────────
  const [editItem, setEditItem] = useState<{
    id: number;
    title: string;
    content: string;
    departmentId: string;
    isPinned: boolean;
  } | null>(null);

  const updateAnnouncement = useUpdateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listAnnouncements"] });
        setEditItem(null);
        toast({ title: "Announcement updated" });
      },
      onError: () => {
        toast({ title: "Failed to update announcement", variant: "destructive" });
      },
    },
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteAnnouncement = useDeleteAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listAnnouncements"] });
        setDeleteId(null);
        toast({ title: "Announcement deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete announcement", variant: "destructive" });
      },
    },
  });

  const openEdit = (a: AnnouncementItem) => {
    setEditItem({
      id: a.id,
      title: a.title,
      content: a.content,
      departmentId: a.departmentId ? String(a.departmentId) : "",
      isPinned: a.isPinned,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    createAnnouncement.mutate({
      data: {
        title: form.title,
        content: form.content,
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        isPinned: form.isPinned,
      },
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">
              Announcements
            </h1>
            <p className="text-muted-foreground mt-1">Company news and important updates.</p>
          </div>
          {isHR && (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Post Announcement
            </Button>
          )}
        </div>

        <div className="grid gap-6 max-w-4xl">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : announcements?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
                  <Megaphone className="h-8 w-8 opacity-50" />
                </div>
                <h3 className="font-medium text-foreground mb-1">No announcements yet</h3>
                <p className="text-sm max-w-sm">
                  When HR posts company updates, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            (announcements as AnnouncementItem[])?.map((announcement) => (
              <Card
                key={announcement.id}
                className={`group transition-all ${announcement.isPinned ? "border-accent/50 shadow-sm" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="font-serif text-xl flex items-center gap-2">
                        {announcement.isPinned && (
                          <Pin className="h-4 w-4 text-accent shrink-0" fill="currentColor" />
                        )}
                        {announcement.title}
                        {announcement.seenByMe && (
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-500 shrink-0"
                            title="You've marked this as seen"
                          />
                        )}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        Posted by {announcement.postedByName} &middot;{" "}
                        {format(new Date(announcement.createdAt), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {announcement.departmentName && (
                        <Badge variant="outline">{announcement.departmentName}</Badge>
                      )}
                      {isHR && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5 text-xs"
                          onClick={() =>
                            setReceiptsAnn({ id: announcement.id, title: announcement.title })
                          }
                          title="View read receipts"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {announcement.seenCount != null ? (
                            <span>{announcement.seenCount} seen</span>
                          ) : (
                            <span>Receipts</span>
                          )}
                        </Button>
                      )}
                      {isHR && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openEdit(announcement)}
                            title="Edit announcement"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setDeleteId(announcement.id)}
                            title="Delete announcement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-foreground leading-relaxed space-y-2">
                    {announcement.content.split("\n").map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-3">
                    {announcement.seenByMe ? (
                      <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        You've seen this announcement
                      </p>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-emerald-600 hover:border-emerald-400"
                        onClick={() => markSeen.mutate({ id: announcement.id })}
                        disabled={markSeen.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark as seen
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Read Receipts Dialog (HR only) */}
      {receiptsAnn && (
        <ReadReceiptsDialog
          announcementId={receiptsAnn.id}
          announcementTitle={receiptsAnn.title}
          open={receiptsAnn !== null}
          onClose={() => setReceiptsAnn(null)}
        />
      )}

      {/* Post Announcement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Post Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="Announcement title…"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your announcement here…"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={5}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Department{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select
                  value={form.departmentId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, departmentId: v === "all" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pin to top</Label>
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={form.isPinned}
                    onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="isPinned" className="text-sm text-muted-foreground">
                    Pin this announcement
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.title || !form.content || createAnnouncement.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createAnnouncement.isPending ? "Posting…" : "Post Announcement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Dialog */}
      <Dialog open={editItem !== null} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Announcement</DialogTitle>
          </DialogHeader>
          {editItem && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateAnnouncement.mutate({
                  id: editItem.id,
                  data: {
                    title: editItem.title,
                    content: editItem.content,
                    departmentId: editItem.departmentId ? parseInt(editItem.departmentId) : null,
                    isPinned: editItem.isPinned,
                  },
                });
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editItem.title}
                  onChange={(e) =>
                    setEditItem((ei) => (ei ? { ...ei, title: e.target.value } : null))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  value={editItem.content}
                  onChange={(e) =>
                    setEditItem((ei) => (ei ? { ...ei, content: e.target.value } : null))
                  }
                  rows={5}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Department{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Select
                    value={editItem.departmentId || "all"}
                    onValueChange={(v) =>
                      setEditItem((ei) =>
                        ei ? { ...ei, departmentId: v === "all" ? "" : v } : null,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All employees</SelectItem>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pin to top</Label>
                  <div className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      id="editIsPinned"
                      checked={editItem.isPinned}
                      onChange={(e) =>
                        setEditItem((ei) => (ei ? { ...ei, isPinned: e.target.checked } : null))
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="editIsPinned" className="text-sm text-muted-foreground">
                      Pin this announcement
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!editItem.title || !editItem.content || updateAnnouncement.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {updateAnnouncement.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this announcement for all employees. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteAnnouncement.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
