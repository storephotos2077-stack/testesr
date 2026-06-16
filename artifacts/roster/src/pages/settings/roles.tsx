import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Minus } from "lucide-react";

const ROLES = [
  {
    name: "Super Admin",
    slug: "super_admin",
    description: "Full system access — ideal for IT owners or platform administrators.",
    level: "Full System",
    badgeVariant: "default" as const,
    badgeClass: "bg-red-100 text-red-700 border-none",
  },
  {
    name: "HR Admin",
    slug: "hr_admin",
    description: "Manages employees, payroll, leave policies, and organizational structure.",
    level: "Organization",
    badgeVariant: "secondary" as const,
    badgeClass: "bg-primary/10 text-primary border-none",
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Views direct reports, approves leave, and conducts performance reviews.",
    level: "Team",
    badgeVariant: "outline" as const,
    badgeClass: "border-accent/50 text-accent",
  },
  {
    name: "Employee",
    slug: "employee",
    description: "Views own profile, applies for leave, marks attendance, and views payslips.",
    level: "Self",
    badgeVariant: "outline" as const,
    badgeClass: "",
  },
];

const PERMISSIONS: { feature: string; super_admin: boolean; hr_admin: boolean; manager: boolean; employee: boolean }[] = [
  { feature: "View own profile & attendance",    super_admin: true,  hr_admin: true,  manager: true,  employee: true  },
  { feature: "Apply for leave",                  super_admin: true,  hr_admin: true,  manager: true,  employee: true  },
  { feature: "View own payslips",                super_admin: true,  hr_admin: true,  manager: true,  employee: true  },
  { feature: "View org chart",                   super_admin: true,  hr_admin: true,  manager: true,  employee: true  },
  { feature: "View announcements",               super_admin: true,  hr_admin: true,  manager: true,  employee: true  },
  { feature: "Approve / reject leave requests",  super_admin: true,  hr_admin: true,  manager: true,  employee: false },
  { feature: "Mark team attendance",             super_admin: true,  hr_admin: true,  manager: true,  employee: false },
  { feature: "Conduct performance reviews",      super_admin: true,  hr_admin: true,  manager: true,  employee: false },
  { feature: "Add / manage employees",           super_admin: true,  hr_admin: true,  manager: false, employee: false },
  { feature: "Manage payroll structures",        super_admin: true,  hr_admin: true,  manager: false, employee: false },
  { feature: "Post announcements",               super_admin: true,  hr_admin: true,  manager: false, employee: false },
  { feature: "Configure departments & holidays", super_admin: true,  hr_admin: true,  manager: false, employee: false },
  { feature: "View reports & analytics",         super_admin: true,  hr_admin: true,  manager: false, employee: false },
  { feature: "Manage leave types",               super_admin: true,  hr_admin: true,  manager: false, employee: false },
  { feature: "Grant / revoke system roles",      super_admin: true,  hr_admin: false, manager: false, employee: false },
  { feature: "Owner console access",             super_admin: true,  hr_admin: false, manager: false, employee: false },
];

function PermCell({ allowed }: { allowed: boolean }) {
  return (
    <td className="px-4 py-3 text-center">
      {allowed ? (
        <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10">
          <Check className="h-3.5 w-3.5 text-primary" />
        </div>
      ) : (
        <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted">
          <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      )}
    </td>
  );
}

export default function RolesSettingsPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div>
          <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Role Management</h1>
          <p className="text-muted-foreground mt-1">System access levels and feature permissions for each role.</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map((role) => (
            <Card key={role.slug} className="relative overflow-hidden">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold font-serif text-base text-sidebar">{role.name}</h3>
                  <Badge className={role.badgeClass} variant={role.badgeVariant}>
                    {role.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Permissions matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Permissions Matrix</CardTitle>
            <CardDescription>What each role can do across the platform</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/2">Feature</th>
                  {ROLES.map((r) => (
                    <th key={r.slug} className="px-4 py-3 text-center font-medium text-muted-foreground w-[12.5%] whitespace-nowrap">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((perm, i) => (
                  <tr
                    key={perm.feature}
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{perm.feature}</td>
                    <PermCell allowed={perm.super_admin} />
                    <PermCell allowed={perm.hr_admin} />
                    <PermCell allowed={perm.manager} />
                    <PermCell allowed={perm.employee} />
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Roles are assigned to users in the Owner Console or by a Super Admin through the employee directory. Role changes take effect immediately.
        </p>
      </div>
    </AppLayout>
  );
}
