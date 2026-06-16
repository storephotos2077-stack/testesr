import { useState, useMemo } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Crown, Gift, Trash2, Activity, Users, AlertTriangle, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

interface UserProfile {
  id: number;
  clerkId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  isOwner: boolean;
  plan: string;
  planExpiresAt: string | null;
  createdAt: string;
}

interface AuditLogEntry {
  id: number;
  adminClerkId: string;
  adminName: string | null;
  targetProfileId: number | null;
  targetName: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const planColors: Record<string, string> = {
  free: "secondary",
  starter: "outline",
  pro: "default",
  enterprise: "destructive",
};

const planLabels: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const actionMeta: Record<string, { label: string; color: string }> = {
  grant_plan:   { label: "Plan Granted",   color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  revoke_plan:  { label: "Plan Revoked",   color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  plan_expired: { label: "Plan Expired",   color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  change_role:  { label: "Role Changed",   color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  claim_owner:  { label: "Claimed Owner",  color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
};

const ALL_ACTIONS = "all";

function formatActionDetail(entry: AuditLogEntry): string {
  const meta = entry.metadata;
  switch (entry.action) {
    case "grant_plan":
      if (!meta) return "";
      return `${planLabels[meta.plan as string] ?? meta.plan}${
        meta.durationDays ? ` · ${meta.durationDays}d` : " · Unlimited"
      }`;
    case "revoke_plan":
      return meta?.previousPlan ? `was ${planLabels[meta.previousPlan as string] ?? meta.previousPlan}` : "→ Free";
    case "plan_expired":
      return meta?.previousPlan ? `was ${planLabels[meta.previousPlan as string] ?? meta.previousPlan}` : "→ Free";
    case "change_role":
      return meta?.role as string ?? "";
    case "claim_owner":
      return "Platform owner";
    default:
      return JSON.stringify(meta ?? "");
  }
}

function daysUntilExpiry(isoDate: string): number {
  return differenceInDays(new Date(isoDate), new Date());
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...opts });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function exportAuditLogCsv(logs: AuditLogEntry[], actionFilter: string) {
  const rows = logs.map((entry) => [
    format(new Date(entry.createdAt), "yyyy-MM-dd HH:mm:ss"),
    entry.adminName ?? entry.adminClerkId,
    actionMeta[entry.action]?.label ?? entry.action,
    entry.targetName ?? (entry.targetProfileId ? `ID ${entry.targetProfileId}` : ""),
    formatActionDetail(entry),
    entry.ipAddress ?? "",
  ]);

  const header = ["When", "Admin", "Action", "Target", "Detail", "IP Address"];
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const timestamp = format(new Date(), "yyyy-MM-dd");
  const suffix = actionFilter !== ALL_ACTIONS ? `-${actionFilter}` : "";
  a.href = url;
  a.download = `audit-log${suffix}-${timestamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [grantDialog, setGrantDialog] = useState<{ user: UserProfile } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [durationDays, setDurationDays] = useState("30");
  const [unlimited, setUnlimited] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState(ALL_ACTIONS);

  const isOwner = !!(me as any)?.isOwner;

  const { data: users, isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch("/api/admin/users"),
    enabled: isOwner,
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["admin-audit-logs"],
    queryFn: () => apiFetch("/api/admin/audit-logs?limit=500"),
    enabled: isOwner,
    refetchInterval: 30_000,
  });

  const filteredLogs = useMemo(() => {
    if (!auditLogs) return [];
    if (auditActionFilter === ALL_ACTIONS) return auditLogs;
    return auditLogs.filter((l) => l.action === auditActionFilter);
  }, [auditLogs, auditActionFilter]);

  const grantMutation = useMutation({
    mutationFn: ({ id, plan, days }: { id: number; plan: string; days?: number }) =>
      apiFetch(`/api/admin/users/${id}/grant-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, durationDays: days }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      setGrantDialog(null);
      toast({ title: "Plan granted", description: `${planLabels[selectedPlan]} plan applied.` });
    },
    onError: () => toast({ title: "Error", description: "Failed to grant plan.", variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/users/${id}/revoke-plan`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast({ title: "Plan revoked", description: "User reverted to Free." });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiFetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast({ title: "Role updated" });
    },
  });

  if (!isOwner) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground" />
          <h2 className="font-serif text-2xl font-bold">Owner Access Required</h2>
          <p className="text-muted-foreground max-w-sm">
            This area is restricted to the platform owner. Make sure your Clerk ID is set as{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">SUPER_OWNER_CLERK_ID</code>{" "}
            in the server environment.
          </p>
        </div>
      </AppLayout>
    );
  }

  const expiringSoonCount = users?.filter(
    (u) => u.plan !== "free" && u.planExpiresAt && daysUntilExpiry(u.planExpiresAt) <= 7 && daysUntilExpiry(u.planExpiresAt) >= 0
  ).length ?? 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Owner Console</h1>
            <p className="text-muted-foreground mt-1">Manage users, roles, plans, and audit history.</p>
          </div>
          {expiringSoonCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-3 py-1 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              {expiringSoonCount} plan{expiringSoonCount !== 1 ? "s" : ""} expiring within 7 days
            </div>
          )}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-2">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" />
              Users
              {users && <span className="ml-1 text-xs text-muted-foreground">({users.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <Activity className="h-4 w-4" />
              Audit Log
              {auditLogs && auditLogs.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({auditLogs.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ──────────────────────── Users tab ──────────────────────────── */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">All Users</CardTitle>
                <CardDescription>Grant paid plans, adjust roles, and manage platform access.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                          </TableRow>
                        ))
                      : users?.map((user) => {
                          const days = user.planExpiresAt ? daysUntilExpiry(user.planExpiresAt) : null;
                          const expiringSoon = days !== null && days <= 7 && days >= 0;
                          return (
                            <TableRow key={user.id} className={expiringSoon ? "bg-amber-50/50" : ""}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium flex items-center gap-1.5">
                                    {user.fullName || "Unknown"}
                                    {user.isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{user.email || user.clerkId}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={user.role}
                                  onValueChange={(role) => roleMutation.mutate({ id: user.id, role })}
                                  disabled={user.isOwner}
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="hr_admin">HR Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="employee">Employee</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Badge variant={(planColors[user.plan] || "secondary") as any}>
                                  {planLabels[user.plan] || user.plan}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {user.planExpiresAt ? (
                                  <span className={`text-sm flex items-center gap-1 ${expiringSoon ? "text-amber-700 font-medium" : "text-muted-foreground"}`}>
                                    {expiringSoon && <AlertTriangle className="h-3.5 w-3.5" />}
                                    {format(new Date(user.planExpiresAt), "MMM d, yyyy")}
                                    {expiringSoon && <span className="text-xs">({days}d)</span>}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {user.plan !== "free" ? "Unlimited" : "—"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1.5"
                                    onClick={() => {
                                      setGrantDialog({ user });
                                      setSelectedPlan("pro");
                                      setDurationDays("30");
                                      setUnlimited(false);
                                    }}
                                  >
                                    <Gift className="h-3.5 w-3.5" />
                                    Grant Plan
                                  </Button>
                                  {user.plan !== "free" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-xs text-destructive hover:text-destructive gap-1.5"
                                      onClick={() => revokeMutation.mutate(user.id)}
                                      disabled={revokeMutation.isPending}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Revoke
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────────────── Audit Log tab ──────────────────────── */}
          <TabsContent value="audit">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="font-serif text-xl">Audit Log</CardTitle>
                  <CardDescription>
                    All owner and system actions. Auto-refreshes every 30 s.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                    <SelectTrigger className="w-44 h-8 text-sm">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_ACTIONS}>All actions</SelectItem>
                      {Object.entries(actionMeta).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    disabled={filteredLogs.length === 0}
                    onClick={() => {
                      exportAuditLogCsv(filteredLogs, auditActionFilter);
                      toast({ title: "CSV exported", description: `${filteredLogs.length} entries downloaded.` });
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                    <Activity className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">
                      {auditActionFilter === ALL_ACTIONS ? "No actions recorded yet." : "No matching entries."}
                    </p>
                    {auditActionFilter === ALL_ACTIONS && (
                      <p className="text-muted-foreground/60 text-xs">
                        Every plan grant, revocation, or role change will appear here.
                      </p>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((entry) => {
                        const info = actionMeta[entry.action] ?? { label: entry.action, color: "bg-gray-100 text-gray-800" };
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              <span title={format(new Date(entry.createdAt), "PPpp")}>
                                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {entry.adminName || (
                                <span className="text-muted-foreground text-xs font-mono">
                                  {entry.adminClerkId.slice(0, 16)}…
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${info.color}`}>
                                {info.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {entry.targetName || (
                                entry.targetProfileId
                                  ? <span className="text-muted-foreground text-xs">ID {entry.targetProfileId}</span>
                                  : <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatActionDetail(entry) || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {entry.ipAddress || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ──────────────────────── Grant plan dialog ──────────────────────── */}
      <Dialog open={!!grantDialog} onOpenChange={(open) => !open && setGrantDialog(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-serif">Grant Plan Access</DialogTitle>
            <DialogDescription>
              Give <strong>{grantDialog?.user.fullName || grantDialog?.user.email}</strong> access to a paid plan.
              An email notification will be sent to them automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Duration</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  value={unlimited ? "" : durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="30"
                  disabled={unlimited}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">days</span>
                <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onChange={(e) => setUnlimited(e.target.checked)}
                    className="rounded"
                  />
                  Unlimited
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank or check Unlimited to grant with no expiry. The 7-day expiry warning email fires automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!grantDialog) return;
                grantMutation.mutate({
                  id: grantDialog.user.id,
                  plan: selectedPlan,
                  days: unlimited ? undefined : Number(durationDays),
                });
              }}
              disabled={grantMutation.isPending}
            >
              {grantMutation.isPending ? "Granting…" : "Grant Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
