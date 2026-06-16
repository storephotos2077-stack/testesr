import { useState } from "react";
import {
  useListPayrollStructures,
  useCreatePayrollStructure,
  useUpdatePayrollStructure,
  useGeneratePayslip,
  useListEmployees,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Banknote, Zap, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface StructureRow {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  basicPay: number;
  netPay?: number | null;
  allowances?: unknown;
  deductions?: unknown;
  effectiveDate?: string | null;
}

interface FormState {
  employeeId: string;
  basicPay: string;
  effectiveDate: string;
  housing: string;
  transport: string;
  tax: string;
  insurance: string;
}

const emptyForm = (date: string): FormState => ({
  employeeId: "",
  basicPay: "",
  effectiveDate: date,
  housing: "",
  transport: "",
  tax: "",
  insurance: "",
});

function getKnownAllowances(allowances: unknown): { housing: string; transport: string } {
  const a = (allowances as Record<string, number>) || {};
  return {
    housing: a["Housing"] != null ? String(a["Housing"]) : "",
    transport: a["Transport"] != null ? String(a["Transport"]) : "",
  };
}

function getKnownDeductions(deductions: unknown): { tax: string; insurance: string } {
  const d = (deductions as Record<string, number>) || {};
  return {
    tax: d["Tax"] != null ? String(d["Tax"]) : "",
    insurance: d["Insurance"] != null ? String(d["Insurance"]) : "",
  };
}

export default function PayrollManagePage() {
  const { data: structures, isLoading } = useListPayrollStructures({});
  const { data: employees } = useListEmployees({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [structureDialog, setStructureDialog] = useState(false);
  const [editStructure, setEditStructure] = useState<StructureRow | null>(null);
  const [generateDialog, setGenerateDialog] = useState(false);

  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split("T")[0];

  const [form, setForm] = useState<FormState>(emptyForm(todayStr));

  const [genForm, setGenForm] = useState({
    employeeId: "",
    month: String(currentDate.getMonth() + 1),
    year: String(currentDate.getFullYear()),
  });

  const createStructure = useCreatePayrollStructure({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listPayrollStructures"] });
        setStructureDialog(false);
        setForm(emptyForm(todayStr));
        toast({ title: "Payroll structure saved", description: "The employee's salary structure has been updated." });
      },
      onError: () => {
        toast({ title: "Failed to save payroll structure", variant: "destructive" });
      },
    },
  });

  const updateStructure = useUpdatePayrollStructure({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listPayrollStructures"] });
        setEditStructure(null);
        setForm(emptyForm(todayStr));
        toast({ title: "Payroll structure updated", description: "Changes have been saved." });
      },
      onError: () => {
        toast({ title: "Failed to update payroll structure", variant: "destructive" });
      },
    },
  });

  const generatePayslip = useGeneratePayslip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listPayslips"] });
        setGenerateDialog(false);
        toast({ title: "Payslip generated", description: "The payslip has been created successfully." });
      },
      onError: () => {
        toast({ title: "Failed to generate payslip", description: "Make sure the employee has a payroll structure.", variant: "destructive" });
      },
    },
  });

  const openEdit = (s: StructureRow) => {
    const a = getKnownAllowances(s.allowances);
    const d = getKnownDeductions(s.deductions);
    setForm({
      employeeId: String(s.employeeId),
      basicPay: String(s.basicPay),
      effectiveDate: s.effectiveDate ? s.effectiveDate.split("T")[0] : todayStr,
      housing: a.housing,
      transport: a.transport,
      tax: d.tax,
      insurance: d.insurance,
    });
    setEditStructure(s);
  };

  const handleStructureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.basicPay || !form.effectiveDate) return;

    const allowances: Record<string, number> = {};
    if (form.housing) allowances["Housing"] = parseFloat(form.housing);
    if (form.transport) allowances["Transport"] = parseFloat(form.transport);

    const deductions: Record<string, number> = {};
    if (form.tax) deductions["Tax"] = parseFloat(form.tax);
    if (form.insurance) deductions["Insurance"] = parseFloat(form.insurance);

    if (editStructure) {
      updateStructure.mutate({
        id: editStructure.id,
        data: {
          basicPay: parseFloat(form.basicPay),
          effectiveDate: form.effectiveDate,
          allowances,
          deductions,
        },
      });
    } else {
      if (!form.employeeId) return;
      createStructure.mutate({
        data: {
          employeeId: parseInt(form.employeeId),
          basicPay: parseFloat(form.basicPay),
          effectiveDate: form.effectiveDate,
          allowances,
          deductions,
        },
      });
    }
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genForm.employeeId || !genForm.month || !genForm.year) return;
    generatePayslip.mutate({
      data: {
        employeeId: parseInt(genForm.employeeId),
        month: parseInt(genForm.month),
        year: parseInt(genForm.year),
      },
    });
  };

  const totalAllowances = (s: { allowances?: unknown }) =>
    Object.values((s.allowances as Record<string, number>) || {}).reduce((a, b) => a + Number(b), 0);

  const totalDeductions = (s: { deductions?: unknown }) =>
    Object.values((s.deductions as Record<string, number>) || {}).reduce((a, b) => a + Number(b), 0);

  const isEditMode = editStructure !== null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Payroll Management</h1>
            <p className="text-muted-foreground mt-1">Manage salary structures and generate payslips.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setForm(emptyForm(todayStr)); setEditStructure(null); setStructureDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Structure
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setGenerateDialog(true)}>
              <Zap className="h-4 w-4 mr-2" /> Generate Payslip
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Payroll Structures</CardTitle>
            <CardDescription>Current salary definitions for all employees</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Basic Pay</TableHead>
                  <TableHead className="text-right">Allowances</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right font-semibold">Net Pay</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : structures?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No payroll structures found. Add the first one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  (structures as unknown as StructureRow[])?.map((s) => (
                    <TableRow key={s.id} className="group">
                      <TableCell className="font-medium">{s.employeeName}</TableCell>
                      <TableCell className="font-mono text-right text-muted-foreground">${fmt(s.basicPay)}</TableCell>
                      <TableCell className="font-mono text-right text-primary">${fmt(totalAllowances(s))}</TableCell>
                      <TableCell className="font-mono text-right text-destructive">${fmt(totalDeductions(s))}</TableCell>
                      <TableCell className="font-mono text-right font-bold">${fmt(s.netPay)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {s.effectiveDate ? format(new Date(s.effectiveDate), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openEdit(s)}
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

      {/* Add / Edit Structure Dialog */}
      <Dialog
        open={structureDialog || isEditMode}
        onOpenChange={(open) => {
          if (!open) { setStructureDialog(false); setEditStructure(null); setForm(emptyForm(todayStr)); }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {isEditMode ? `Edit Structure — ${editStructure?.employeeName}` : "Add Payroll Structure"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStructureSubmit} className="space-y-4 mt-2">
            {!isEditMode && (
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
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Basic Pay ($)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.basicPay} onChange={(e) => setForm((f) => ({ ...f, basicPay: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Effective Date</Label>
                <Input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Allowances</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Housing ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.housing} onChange={(e) => setForm((f) => ({ ...f, housing: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Transport ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.transport} onChange={(e) => setForm((f) => ({ ...f, transport: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Deductions</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tax ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.tax} onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Insurance ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.insurance} onChange={(e) => setForm((f) => ({ ...f, insurance: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setStructureDialog(false); setEditStructure(null); setForm(emptyForm(todayStr)); }}>Cancel</Button>
              <Button
                type="submit"
                disabled={(!isEditMode && !form.employeeId) || !form.basicPay || createStructure.isPending || updateStructure.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createStructure.isPending || updateStructure.isPending ? "Saving…" : isEditMode ? "Save Changes" : "Save Structure"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Payslip Dialog */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" /> Generate Payslip
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerateSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={genForm.employeeId} onValueChange={(v) => setGenForm((f) => ({ ...f, employeeId: v }))}>
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
                <Label>Month</Label>
                <Select value={genForm.month} onValueChange={(v) => setGenForm((f) => ({ ...f, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={genForm.year} onValueChange={(v) => setGenForm((f) => ({ ...f, year: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[currentDate.getFullYear() - 1, currentDate.getFullYear()].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              Generating a payslip will calculate net pay based on the employee's current payroll structure and mark it as <span className="font-medium text-foreground">draft</span>.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenerateDialog(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={!genForm.employeeId || generatePayslip.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {generatePayslip.isPending ? "Generating…" : "Generate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
