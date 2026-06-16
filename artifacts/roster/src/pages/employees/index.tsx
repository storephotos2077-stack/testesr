import { useState } from "react";
import { useListEmployees, useListDepartments } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Search, Plus, MoreHorizontal, Download, ChevronDown, Users, UserCheck, UserX, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type EmployeeSummaryItem = {
  id: number;
  fullName: string;
  employeeCode: string;
  status: string;
  email?: string | null;
  designationName?: string | null;
  departmentName?: string | null;
  joinDate?: string | null;
};

function exportEmployeesCsv(employees: EmployeeSummaryItem[]) {
  if (!employees?.length) return;
  const headers = ["Code", "Full Name", "Email", "Department", "Designation", "Status", "Joined"];
  const rows = employees.map((e) => [
    e.employeeCode,
    e.fullName,
    e.email ?? "",
    e.departmentName ?? "",
    e.designationName ?? "",
    e.status,
    e.joinDate ? format(new Date(e.joinDate), "yyyy-MM-dd") : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `employees-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [deptId, setDeptId] = useState<number | undefined>();

  const { data, isLoading } = useListEmployees({
    search: search || undefined,
    department: deptId,
  });

  // Unfiltered query to compute headcount stats
  const { data: allData } = useListEmployees({});

  const { data: departments } = useListDepartments();

  const employees = data?.data ?? [];
  const allEmployees = allData?.data ?? [];
  const activeDeptName = departments?.find((d) => d.id === deptId)?.name;

  const activeCount = allEmployees.filter((e) => e.status === "active").length;
  const inactiveCount = allEmployees.filter((e) => e.status !== "active").length;
  const deptCount = departments?.length ?? 0;

  const stats = [
    { label: "Total Employees", value: allEmployees.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active", value: activeCount, icon: UserCheck, color: "text-primary", bg: "bg-primary/10" },
    { label: "Inactive", value: inactiveCount, icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Departments", value: deptCount, icon: Building2, color: "text-[#4C7A8C]", bg: "bg-[#4C7A8C]/10" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Team Directory</h1>
            <p className="text-muted-foreground mt-1">Manage and view all employee profiles across the organization.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportEmployeesCsv(employees)}
              disabled={isLoading || employees.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Link href="/app/employees/new">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" /> Add Employee
              </Button>
            </Link>
          </div>
        </div>

        {/* Headcount stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat) => (
            isLoading ? (
              <Card key={stat.label}><CardContent className="pt-5"><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-4 w-24" /></CardContent></Card>
            ) : (
              <Card key={stat.label}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                    <div className={`h-7 w-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className={`text-3xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
                </CardContent>
              </Card>
            )
          ))}
        </div>

        <div className="bg-card border rounded-lg shadow-sm">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role…"
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {activeDeptName ?? "All Departments"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setDeptId(undefined)}>
                    All Departments
                  </DropdownMenuItem>
                  {departments?.map((dept) => (
                    <DropdownMenuItem key={dept.id} onClick={() => setDeptId(dept.id)}>
                      {dept.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No employees found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0 overflow-hidden">
                            {(employee as EmployeeSummaryItem & { avatarUrl?: string | null }).avatarUrl ? (
                              <img src={(employee as EmployeeSummaryItem & { avatarUrl?: string | null }).avatarUrl!} alt={employee.fullName} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              employee.fullName.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{employee.fullName}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{employee.employeeCode}</TableCell>
                      <TableCell>{employee.designationName || "-"}</TableCell>
                      <TableCell>{employee.departmentName || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {(employee as EmployeeSummaryItem).joinDate
                          ? format(new Date((employee as EmployeeSummaryItem).joinDate!), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.status === "active" ? "default" : "secondary"}
                          className={employee.status === "active" ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}
                        >
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/app/employees/${employee.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {employees.length > 0 && (
            <div className="px-4 py-3 border-t text-xs text-muted-foreground font-mono">
              Showing {employees.length} employee{employees.length !== 1 ? "s" : ""}
              {activeDeptName ? ` in ${activeDeptName}` : ""}
              {search ? ` matching "${search}"` : ""}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
