import { useState } from "react";
import {
  useListDepartments,
  useListDesignations,
  useListLeaveTypes,
  useListHolidays,
  useCreateDepartment,
  useCreateDesignation,
  useCreateLeaveType,
  useCreateHoliday,
  useUpdateDepartment,
  useUpdateDesignation,
  useUpdateLeaveType,
  useUpdateHoliday,
  useDeleteDepartment,
  useDeleteDesignation,
  useDeleteHoliday,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments, isLoading: isLoadingDepts } = useListDepartments();
  const { data: designations, isLoading: isLoadingDesigs } = useListDesignations();
  const { data: leaveTypes, isLoading: isLoadingLeaves } = useListLeaveTypes();
  const { data: holidays, isLoading: isLoadingHolidays } = useListHolidays({});

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteDeptId, setDeleteDeptId] = useState<number | null>(null);
  const [deleteDesigId, setDeleteDesigId] = useState<number | null>(null);
  const [deleteHolidayId, setDeleteHolidayId] = useState<number | null>(null);

  const deleteDept = useDeleteDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listDepartments"] });
        setDeleteDeptId(null);
        toast({ title: "Department deleted" });
      },
      onError: () => toast({ title: "Failed to delete department", variant: "destructive" }),
    },
  });

  const deleteDesig = useDeleteDesignation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listDesignations"] });
        setDeleteDesigId(null);
        toast({ title: "Designation deleted" });
      },
      onError: () => toast({ title: "Failed to delete designation", variant: "destructive" }),
    },
  });

  const deleteHoliday = useDeleteHoliday({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listHolidays"] });
        setDeleteHolidayId(null);
        toast({ title: "Holiday deleted" });
      },
      onError: () => toast({ title: "Failed to delete holiday", variant: "destructive" }),
    },
  });

  // ── Add Department ────────────────────────────────────────────────────────
  const [deptDialog, setDeptDialog] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [editDept, setEditDept] = useState<{ id: number; name: string; description: string } | null>(null);

  const createDept = useCreateDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listDepartments"] });
        toast({ title: "Department created" });
        setDeptDialog(false);
        setDeptForm({ name: "", description: "" });
      },
    },
  });

  const updateDept = useUpdateDepartment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listDepartments"] });
        toast({ title: "Department updated" });
        setEditDept(null);
      },
      onError: () => toast({ title: "Failed to update department", variant: "destructive" }),
    },
  });

  // ── Add Designation ───────────────────────────────────────────────────────
  const [desigDialog, setDesigDialog] = useState(false);
  const [desigForm, setDesigForm] = useState({ name: "", departmentId: "" });
  const [editDesig, setEditDesig] = useState<{ id: number; name: string; departmentId: string } | null>(null);

  const createDesig = useCreateDesignation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listDesignations"] });
        toast({ title: "Designation created" });
        setDesigDialog(false);
        setDesigForm({ name: "", departmentId: "" });
      },
    },
  });

  const updateDesig = useUpdateDesignation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listDesignations"] });
        toast({ title: "Designation updated" });
        setEditDesig(null);
      },
      onError: () => toast({ title: "Failed to update designation", variant: "destructive" }),
    },
  });

  // ── Add Leave Type ────────────────────────────────────────────────────────
  const [ltDialog, setLtDialog] = useState(false);
  const [ltForm, setLtForm] = useState({ name: "", defaultDays: "10", isPaid: "true", carryForward: "false" });
  const [editLt, setEditLt] = useState<{ id: number; name: string; defaultDays: string; isPaid: string; carryForward: string } | null>(null);

  const createLt = useCreateLeaveType({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listLeaveTypes"] });
        toast({ title: "Leave type created" });
        setLtDialog(false);
        setLtForm({ name: "", defaultDays: "10", isPaid: "true", carryForward: "false" });
      },
    },
  });

  const updateLt = useUpdateLeaveType({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listLeaveTypes"] });
        toast({ title: "Leave type updated" });
        setEditLt(null);
      },
      onError: () => toast({ title: "Failed to update leave type", variant: "destructive" }),
    },
  });

  // ── Add Holiday ───────────────────────────────────────────────────────────
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", isOptional: "false" });
  const [editHoliday, setEditHoliday] = useState<{ id: number; name: string; date: string; isOptional: string } | null>(null);

  const createHoliday = useCreateHoliday({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listHolidays"] });
        toast({ title: "Holiday added" });
        setHolidayDialog(false);
        setHolidayForm({ name: "", date: "", isOptional: "false" });
      },
    },
  });

  const updateHoliday = useUpdateHoliday({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listHolidays"] });
        toast({ title: "Holiday updated" });
        setEditHoliday(null);
      },
      onError: () => toast({ title: "Failed to update holiday", variant: "destructive" }),
    },
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div>
          <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground mt-1">Configure departments, designations, leave policies, and holidays.</p>
        </div>

        <Tabs defaultValue="departments" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-6">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="designations">Designations</TabsTrigger>
            <TabsTrigger value="leavetypes">Leave Types</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
          </TabsList>

          {/* ── Departments ── */}
          <TabsContent value="departments">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="font-serif text-xl">Departments</CardTitle>
                  <CardDescription>Organizational units in your company</CardDescription>
                </div>
                <Button size="sm" onClick={() => setDeptDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Department
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Headcount</TableHead>
                      <TableHead className="text-right w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDepts ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))
                    ) : departments?.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No departments yet. Add your first one.</TableCell></TableRow>
                    ) : departments?.map((d) => (
                      <TableRow key={d.id} className="group">
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{d.employeeCount ?? 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditDept({ id: d.id, name: d.name, description: (d as any).description ?? "" })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {(d.employeeCount ?? 0) === 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteDeptId(d.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Designations ── */}
          <TabsContent value="designations">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="font-serif text-xl">Designations</CardTitle>
                  <CardDescription>Job titles within each department</CardDescription>
                </div>
                <Button size="sm" onClick={() => setDesigDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Designation
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDesigs ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))
                    ) : designations?.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No designations yet.</TableCell></TableRow>
                    ) : designations?.map((d) => (
                      <TableRow key={d.id} className="group">
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-muted-foreground">{d.departmentName ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditDesig({
                                id: d.id,
                                name: d.name,
                                departmentId: d.departmentId != null ? String(d.departmentId) : "",
                              })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteDesigId(d.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Leave Types ── */}
          <TabsContent value="leavetypes">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="font-serif text-xl">Leave Types</CardTitle>
                  <CardDescription>Categories of time off available to employees</CardDescription>
                </div>
                <Button size="sm" onClick={() => setLtDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Leave Type
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Default Days</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Carry Forward</TableHead>
                      <TableHead className="text-right w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLeaves ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))
                    ) : leaveTypes?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No leave types yet.</TableCell></TableRow>
                    ) : leaveTypes?.map((l) => (
                      <TableRow key={l.id} className="group">
                        <TableCell className="font-medium">{l.name}</TableCell>
                        <TableCell className="font-mono">{l.defaultDays}</TableCell>
                        <TableCell>
                          <Badge variant={l.isPaid ? "default" : "secondary"} className={l.isPaid ? "bg-primary/10 text-primary border-none hover:bg-primary/20" : ""}>
                            {l.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{l.carryForward ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditLt({
                              id: l.id,
                              name: l.name,
                              defaultDays: String(l.defaultDays),
                              isPaid: l.isPaid ? "true" : "false",
                              carryForward: l.carryForward ? "true" : "false",
                            })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Holidays ── */}
          <TabsContent value="holidays">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="font-serif text-xl">Holidays</CardTitle>
                  <CardDescription>Company-wide and optional days off</CardDescription>
                </div>
                <Button size="sm" onClick={() => setHolidayDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Holiday
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingHolidays ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))
                    ) : holidays?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No holidays added yet.</TableCell></TableRow>
                    ) : holidays?.map((h) => (
                      <TableRow key={h.id} className="group">
                        <TableCell className="font-medium">{h.name}</TableCell>
                        <TableCell className="font-mono text-sm">{format(new Date(h.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={h.isOptional ? "outline" : "secondary"}>
                            {h.isOptional ? "Optional" : "Mandatory"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditHoliday({
                                id: h.id,
                                name: h.name,
                                date: h.date.split("T")[0],
                                isOptional: h.isOptional ? "true" : "false",
                              })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteHolidayId(h.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Add Department Dialog ── */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">Add Department</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!deptForm.name) return;
              createDept.mutate({ data: { name: deptForm.name, description: deptForm.description || undefined } });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Department Name</Label>
              <Input placeholder="e.g. Engineering" value={deptForm.name} onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input placeholder="Brief description…" value={deptForm.description} onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDeptDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!deptForm.name || createDept.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {createDept.isPending ? "Saving…" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Department Dialog ── */}
      <Dialog open={editDept !== null} onOpenChange={(open) => !open && setEditDept(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">Edit Department</DialogTitle></DialogHeader>
          {editDept && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateDept.mutate({ id: editDept.id, data: { name: editDept.name, description: editDept.description || undefined } });
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label>Department Name</Label>
                <Input value={editDept.name} onChange={(e) => setEditDept((d) => d ? { ...d, name: e.target.value } : null)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input placeholder="Brief description…" value={editDept.description} onChange={(e) => setEditDept((d) => d ? { ...d, description: e.target.value } : null)} />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditDept(null)}>Cancel</Button>
                <Button type="submit" disabled={!editDept.name || updateDept.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {updateDept.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Designation Dialog ── */}
      <Dialog open={desigDialog} onOpenChange={setDesigDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">Add Designation</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!desigForm.name || !desigForm.departmentId) return;
              createDesig.mutate({ data: { name: desigForm.name, departmentId: parseInt(desigForm.departmentId) } });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Senior Engineer" value={desigForm.name} onChange={(e) => setDesigForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={desigForm.departmentId} onValueChange={(v) => setDesigForm((f) => ({ ...f, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDesigDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!desigForm.name || !desigForm.departmentId || createDesig.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {createDesig.isPending ? "Saving…" : "Create Designation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Designation Dialog ── */}
      <Dialog open={editDesig !== null} onOpenChange={(open) => !open && setEditDesig(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">Edit Designation</DialogTitle></DialogHeader>
          {editDesig && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateDesig.mutate({
                  id: editDesig.id,
                  data: {
                    name: editDesig.name,
                    departmentId: editDesig.departmentId ? parseInt(editDesig.departmentId) : undefined,
                  },
                });
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editDesig.name} onChange={(e) => setEditDesig((d) => d ? { ...d, name: e.target.value } : null)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={editDesig.departmentId} onValueChange={(v) => setEditDesig((d) => d ? { ...d, departmentId: v } : null)}>
                  <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                  <SelectContent>
                    {departments?.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditDesig(null)}>Cancel</Button>
                <Button type="submit" disabled={!editDesig.name || updateDesig.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {updateDesig.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Leave Type Dialog ── */}
      <Dialog open={ltDialog} onOpenChange={setLtDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">Add Leave Type</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!ltForm.name || !ltForm.defaultDays) return;
              createLt.mutate({
                data: {
                  name: ltForm.name,
                  defaultDays: parseInt(ltForm.defaultDays),
                  isPaid: ltForm.isPaid === "true",
                  carryForward: ltForm.carryForward === "true",
                },
              });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Annual Leave" value={ltForm.name} onChange={(e) => setLtForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Default Days Per Year</Label>
                <Input type="number" min="0" value={ltForm.defaultDays} onChange={(e) => setLtForm((f) => ({ ...f, defaultDays: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Paid Leave?</Label>
                <Select value={ltForm.isPaid} onValueChange={(v) => setLtForm((f) => ({ ...f, isPaid: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes — Paid</SelectItem>
                    <SelectItem value="false">No — Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Carry Forward Unused Days?</Label>
              <Select value={ltForm.carryForward} onValueChange={(v) => setLtForm((f) => ({ ...f, carryForward: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No — Reset every year</SelectItem>
                  <SelectItem value="true">Yes — Carry to next year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setLtDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!ltForm.name || !ltForm.defaultDays || createLt.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {createLt.isPending ? "Saving…" : "Create Leave Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Leave Type Dialog ── */}
      <Dialog open={editLt !== null} onOpenChange={(open) => !open && setEditLt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">Edit Leave Type</DialogTitle></DialogHeader>
          {editLt && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLt.mutate({
                  id: editLt.id,
                  data: {
                    name: editLt.name,
                    defaultDays: parseInt(editLt.defaultDays),
                    isPaid: editLt.isPaid === "true",
                    carryForward: editLt.carryForward === "true",
                  },
                });
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={editLt.name} onChange={(e) => setEditLt((l) => l ? { ...l, name: e.target.value } : null)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Default Days Per Year</Label>
                  <Input type="number" min="0" value={editLt.defaultDays} onChange={(e) => setEditLt((l) => l ? { ...l, defaultDays: e.target.value } : null)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Paid Leave?</Label>
                  <Select value={editLt.isPaid} onValueChange={(v) => setEditLt((l) => l ? { ...l, isPaid: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes — Paid</SelectItem>
                      <SelectItem value="false">No — Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Carry Forward Unused Days?</Label>
                <Select value={editLt.carryForward} onValueChange={(v) => setEditLt((l) => l ? { ...l, carryForward: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No — Reset every year</SelectItem>
                    <SelectItem value="true">Yes — Carry to next year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditLt(null)}>Cancel</Button>
                <Button type="submit" disabled={!editLt.name || updateLt.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {updateLt.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Holiday Dialog ── */}
      <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">Add Holiday</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!holidayForm.name || !holidayForm.date) return;
              createHoliday.mutate({
                data: {
                  name: holidayForm.name,
                  date: holidayForm.date,
                  isOptional: holidayForm.isOptional === "true",
                },
              });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Holiday Name</Label>
              <Input placeholder="e.g. Independence Day" value={holidayForm.name} onChange={(e) => setHolidayForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Holiday Type</Label>
              <Select value={holidayForm.isOptional} onValueChange={(v) => setHolidayForm((f) => ({ ...f, isOptional: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Mandatory — entire company</SelectItem>
                  <SelectItem value="true">Optional — employee choice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setHolidayDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!holidayForm.name || !holidayForm.date || createHoliday.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {createHoliday.isPending ? "Saving…" : "Add Holiday"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Holiday Dialog ── */}
      <Dialog open={editHoliday !== null} onOpenChange={(open) => !open && setEditHoliday(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-serif text-xl">Edit Holiday</DialogTitle></DialogHeader>
          {editHoliday && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateHoliday.mutate({
                  id: editHoliday.id,
                  data: {
                    name: editHoliday.name,
                    date: editHoliday.date,
                    isOptional: editHoliday.isOptional === "true",
                  },
                });
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label>Holiday Name</Label>
                <Input value={editHoliday.name} onChange={(e) => setEditHoliday((h) => h ? { ...h, name: e.target.value } : null)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={editHoliday.date} onChange={(e) => setEditHoliday((h) => h ? { ...h, date: e.target.value } : null)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Holiday Type</Label>
                <Select value={editHoliday.isOptional} onValueChange={(v) => setEditHoliday((h) => h ? { ...h, isOptional: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Mandatory — entire company</SelectItem>
                    <SelectItem value="true">Optional — employee choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditHoliday(null)}>Cancel</Button>
                <Button type="submit" disabled={!editHoliday.name || !editHoliday.date || updateHoliday.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {updateHoliday.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmations ── */}
      <AlertDialog open={deleteDeptId !== null} onOpenChange={(open) => !open && setDeleteDeptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDeptId && deleteDept.mutate({ id: deleteDeptId })}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDesigId !== null} onOpenChange={(open) => !open && setDeleteDesigId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete designation?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDesigId && deleteDesig.mutate({ id: deleteDesigId })}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteHolidayId !== null} onOpenChange={(open) => !open && setDeleteHolidayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holiday?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteHolidayId && deleteHoliday.mutate({ id: deleteHolidayId })}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
