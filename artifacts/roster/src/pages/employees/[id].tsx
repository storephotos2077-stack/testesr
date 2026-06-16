import { useState } from "react";
import { useParams } from "wouter";
import {
  useGetEmployee,
  useUpdateEmployee,
  useListDepartments,
  useListDesignations,
  useGetMe,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
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
import { ChevronLeft, Mail, Phone, MapPin, Building, Briefcase, Calendar, Pencil, PowerOff, Power } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeProfile() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile } = useGetMe();
  const { data: employee, isLoading } = useGetEmployee(id, {
    query: { enabled: !!id, queryKey: ["employee", id] }
  });
  const { data: departments } = useListDepartments();
  const { data: designations } = useListDesignations();

  const isHR = profile?.role === "super_admin" || profile?.role === "hr_admin";

  const [editOpen, setEditOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    departmentId: "",
    designationId: "",
  });

  const openEdit = () => {
    if (!employee) return;
    setForm({
      fullName: employee.fullName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      address: employee.address || "",
      departmentId: employee.departmentId ? String(employee.departmentId) : "",
      designationId: employee.designationId ? String(employee.designationId) : "",
    });
    setEditOpen(true);
  };

  const updateEmployee = useUpdateEmployee({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["employee", id] });
        queryClient.invalidateQueries({ queryKey: ["listEmployees"] });
        setEditOpen(false);
        setStatusConfirm(false);
        toast({ title: "Profile updated", description: "Changes have been saved." });
      },
      onError: () => {
        toast({ title: "Failed to update profile", variant: "destructive" });
      },
    },
  });

  const handleStatusToggle = () => {
    if (!employee) return;
    const newStatus = employee.status === "active" ? "inactive" : "active";
    updateEmployee.mutate({ id, data: { status: newStatus } });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmployee.mutate({
      id,
      data: {
        fullName: form.fullName || undefined,
        email: form.email || undefined,
        phone: form.phone || null,
        address: form.address || null,
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        designationId: form.designationId ? parseInt(form.designationId) : null,
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 md:col-span-1" />
            <Skeleton className="h-64 md:col-span-2" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">
          Employee not found.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
        <div className="flex items-center gap-4">
          <Link href="/app/employees">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Employee Profile</h1>
          </div>
          <div className="flex gap-2">
            {isHR && (
              <Button
                variant="outline"
                className={employee.status === "active" ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "text-primary hover:bg-primary/10"}
                onClick={() => setStatusConfirm(true)}
                disabled={updateEmployee.isPending}
              >
                {employee.status === "active" ? <><PowerOff className="h-4 w-4 mr-2" /> Deactivate</> : <><Power className="h-4 w-4 mr-2" /> Activate</>}
              </Button>
            )}
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-2xl mb-4 overflow-hidden">
                {employee.avatarUrl ? (
                  <img src={employee.avatarUrl} alt={employee.fullName} className="h-full w-full object-cover" />
                ) : (
                  employee.fullName.charAt(0)
                )}
              </div>
              <h2 className="font-serif text-xl font-bold">{employee.fullName}</h2>
              <p className="text-muted-foreground font-mono text-sm mt-1">{employee.employeeCode}</p>

              <Badge
                variant={employee.status === "active" ? "default" : "secondary"}
                className={`mt-4 ${employee.status === "active" ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}`}
              >
                {employee.status}
              </Badge>

              <div className="w-full mt-6 space-y-3 text-sm text-left">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{employee.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{employee.address || "Not provided"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Department</div>
                  <div className="flex items-center gap-2 font-medium">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    {employee.departmentName || "Unassigned"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Designation</div>
                  <div className="flex items-center gap-2 font-medium">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    {employee.designationName || "Unassigned"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Manager</div>
                  <div className="font-medium">{employee.managerName || "None"}</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Hire Date</div>
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Employment Type</div>
                  <div className="font-medium capitalize">
                    {employee.employmentType?.replace("_", " ") || "-"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                {employee.emergencyContactName ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Name</div>
                      <div className="font-medium">{employee.emergencyContactName}</div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Phone</div>
                      <div className="font-medium">{employee.emergencyContactPhone || "-"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No emergency contact information provided.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Full Name</Label>
                <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments?.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Select value={form.designationId} onValueChange={(v) => setForm((f) => ({ ...f, designationId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {designations?.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={!form.fullName || updateEmployee.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updateEmployee.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Status toggle confirmation */}
      <AlertDialog open={statusConfirm} onOpenChange={setStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {employee.status === "active" ? "Deactivate employee?" : "Activate employee?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {employee.status === "active"
                ? `${employee.fullName} will be marked as inactive and may lose access to certain systems.`
                : `${employee.fullName} will be reactivated and restored to active status.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={employee.status === "active"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"}
              onClick={handleStatusToggle}
            >
              {employee.status === "active" ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
