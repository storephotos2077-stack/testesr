import { useState } from "react";
import {
  useListDocuments,
  useCreateDocument,
  useDeleteDocument,
  useGetMe,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { FileText, Download, Upload, FolderOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const DOCUMENT_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "nda", label: "NDA" },
  { value: "policy", label: "Policy" },
  { value: "id_proof", label: "ID Proof" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

interface Doc {
  id: number;
  name: string;
  type: string;
  fileUrl?: string | null;
  fileSize?: number | null;
  isCompanyPolicy?: boolean;
  createdAt: string;
}

export default function DocumentsPage() {
  const { data: documents, isLoading } = useListDocuments({});
  const { data: profile } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isHR = profile?.role === "super_admin" || profile?.role === "hr_admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "",
    fileUrl: "",
    isCompanyPolicy: "false",
  });

  const createDoc = useCreateDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listDocuments"] });
        setDialogOpen(false);
        setForm({ name: "", type: "", fileUrl: "", isCompanyPolicy: "false" });
        toast({ title: "Document added", description: "It is now visible in the vault." });
      },
      onError: () => {
        toast({ title: "Failed to add document", variant: "destructive" });
      },
    },
  });

  const deleteDoc = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listDocuments"] });
        setDeleteId(null);
        toast({ title: "Document removed" });
      },
      onError: () => {
        toast({ title: "Failed to delete document", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) return;
    createDoc.mutate({
      data: {
        name: form.name,
        type: form.type,
        fileUrl: form.fileUrl || null,
        isCompanyPolicy: form.isCompanyPolicy === "true",
        employeeId: form.isCompanyPolicy === "true" ? null : (profile?.employeeId ?? null),
      },
    });
  };

  const companyPolicies: Doc[] = (documents?.filter((d) => d.isCompanyPolicy) ?? []) as Doc[];
  const personalDocs: Doc[] = (documents?.filter((d) => !d.isCompanyPolicy) ?? []) as Doc[];

  const DocCard = ({ doc }: { doc: Doc }) => (
    <div className="p-4 border rounded-lg flex items-start gap-3 hover:bg-muted/30 transition-colors group">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{doc.name}</div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5 capitalize">
          {doc.type.replace(/_/g, " ")}
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">
          {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB · ` : ""}
          {format(new Date(doc.createdAt), "MMM d, yyyy")}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {doc.fileUrl && (
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setDeleteId(doc.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Documents</h1>
            <p className="text-muted-foreground mt-1">Company policies and your personal vault.</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Add Document
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Company Policies</CardTitle>
            <CardDescription>Documents shared with all employees</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : companyPolicies.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No company policies uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyPolicies.map((doc) => <DocCard key={doc.id} doc={doc} />)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">My Vault</CardTitle>
            <CardDescription>Your personal documents and records</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24" />
              </div>
            ) : personalDocs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No personal documents uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personalDocs.map((doc) => <DocCard key={doc.id} doc={doc} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Document Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Add Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Document Name</Label>
              <Input
                placeholder="e.g. Employee Handbook 2025"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>File URL <span className="text-muted-foreground font-normal">(optional link)</span></Label>
              <Input
                type="url"
                placeholder="https://…"
                value={form.fileUrl}
                onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
              />
            </div>
            {isHR && (
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select value={form.isCompanyPolicy} onValueChange={(v) => setForm((f) => ({ ...f, isCompanyPolicy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Personal — only visible to me</SelectItem>
                    <SelectItem value="true">Company Policy — visible to all</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={!form.name || !form.type || createDoc.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createDoc.isPending ? "Saving…" : "Add Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteDoc.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
