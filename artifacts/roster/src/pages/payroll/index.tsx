import { useState } from "react";
import { useListPayslips, useGetMe } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, ChevronLeft, ChevronRight, Printer, X } from "lucide-react";
import { format } from "date-fns";

interface Payslip {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  month: number;
  year: number;
  grossPay: number;
  netPay: number;
  status: string;
  allowances?: unknown;
  deductions?: unknown;
}

function PayslipReceipt({ payslip, employeeName }: { payslip: Payslip; employeeName?: string | null }) {
  const monthLabel = format(new Date(payslip.year, payslip.month - 1), "MMMM yyyy");
  const allowances = (payslip.allowances as Record<string, number>) || {};
  const deductions = (payslip.deductions as Record<string, number>) || {};
  const totalAllowances = Object.values(allowances).reduce((a, b) => a + Number(b), 0);
  const totalDeductions = Object.values(deductions).reduce((a, b) => a + Number(b), 0);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="font-mono text-sm space-y-4">
      {/* Header */}
      <div className="text-center border-b pb-4">
        <div className="text-2xl font-bold font-serif not-mono" style={{ color: "hsl(152 21% 14%)" }}>Roster</div>
        <div className="text-muted-foreground text-xs mt-1 uppercase tracking-widest">Pay Slip</div>
        <div className="font-semibold mt-2">{monthLabel}</div>
      </div>

      {/* Employee info */}
      <div className="space-y-1 border-b pb-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Employee</span>
          <span className="font-medium">{payslip.employeeName ?? employeeName ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pay Period</span>
          <span>{monthLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="capitalize">{payslip.status}</span>
        </div>
      </div>

      {/* Earnings */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Earnings</div>
        <div className="flex justify-between">
          <span>Basic Pay</span>
          <span>${fmt(payslip.grossPay - totalAllowances)}</span>
        </div>
        {Object.entries(allowances).map(([key, val]) => (
          <div key={key} className="flex justify-between text-primary">
            <span>{key}</span>
            <span>+${fmt(Number(val))}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold border-t pt-1">
          <span>Gross Pay</span>
          <span>${fmt(payslip.grossPay)}</span>
        </div>
      </div>

      {/* Deductions */}
      {Object.keys(deductions).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Deductions</div>
          {Object.entries(deductions).map(([key, val]) => (
            <div key={key} className="flex justify-between text-destructive">
              <span>{key}</span>
              <span>-${fmt(Number(val))}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t pt-1">
            <span>Total Deductions</span>
            <span>-${fmt(totalDeductions)}</span>
          </div>
        </div>
      )}

      {/* Net pay */}
      <div className="border-t-2 border-double pt-4 flex justify-between text-lg font-bold" style={{ color: "hsl(152 21% 14%)" }}>
        <span>Net Pay</span>
        <span>${fmt(payslip.netPay)}</span>
      </div>

      <div className="text-center text-xs text-muted-foreground pt-2 border-t">
        Generated {format(new Date(), "MMM d, yyyy 'at' h:mm a")} · Roster HR Platform
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: payslips, isLoading } = useListPayslips({ year });
  const { data: profile } = useGetMe();
  const [previewPayslip, setPreviewPayslip] = useState<Payslip | null>(null);

  const totalGross = payslips?.reduce((s, p) => s + (p.grossPay ?? 0), 0) ?? 0;
  const totalNet = payslips?.reduce((s, p) => s + (p.netPay ?? 0), 0) ?? 0;
  const publishedCount = payslips?.filter((p) => p.status === "published").length ?? 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Payroll</h1>
            <p className="text-muted-foreground mt-1">View and download your payslips.</p>
          </div>

          {/* Year picker */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setYear((y) => y - 1)}
              disabled={year <= 2020}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-mono font-semibold text-sm w-12 text-center">{year}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        {!isLoading && publishedCount > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Published Payslips", value: publishedCount, mono: false },
              { label: "Total Gross Pay", value: `$${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, mono: true },
              { label: "Total Net Pay", value: `$${totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, mono: true },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.mono ? "font-mono" : ""}`} style={{ color: "hsl(152 21% 14%)" }}>
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Payslips for {year}</CardTitle>
            <CardDescription>Your monthly salary slips</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : payslips?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No payslips available for {year}.
                    </TableCell>
                  </TableRow>
                ) : (
                  (payslips as unknown as Payslip[])?.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">
                        {format(new Date(payslip.year, payslip.month - 1), "MMMM yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        ${payslip.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-destructive">
                        -${((payslip.grossPay ?? 0) - payslip.netPay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        ${payslip.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={payslip.status === "published" ? "default" : "secondary"}
                          className={payslip.status === "published" ? "bg-primary/10 text-primary border-none hover:bg-primary/20" : ""}
                        >
                          {payslip.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={payslip.status !== "published"}
                          onClick={() => setPreviewPayslip(payslip)}
                        >
                          <Download className="h-4 w-4 mr-2" /> Download
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

      {/* Payslip Preview / Print Dialog */}
      <Dialog open={previewPayslip !== null} onOpenChange={(open) => !open && setPreviewPayslip(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-serif text-xl">Payslip</DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
              </div>
            </div>
          </DialogHeader>
          {previewPayslip && (
            <div className="mt-2">
              <PayslipReceipt payslip={previewPayslip} employeeName={profile?.fullName} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
