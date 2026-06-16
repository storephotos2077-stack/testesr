import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useGetMe } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Crown, Search } from "lucide-react";
import { format } from "date-fns";

interface HRUser {
  id: number;
  clerkId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  isOwner: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  hr_admin: "HR Admin",
  manager: "Manager",
  employee: "Employee",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 border-none",
  hr_admin: "bg-primary/10 text-primary border-none",
  manager: "bg-[#4C7A8C]/10 text-[#4C7A8C] border-none",
  employee: "bg-muted text-muted-foreground border-none",
};

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...opts });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export default function UsersSettingsPage() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const isHROrAbove =
    me?.role === "super_admin" || me?.role === "hr_admin";

  const { data: users, isLoading } = useQuery<HRUser[]>({
    queryKey: ["hr-users"],
    queryFn: () => apiFetch("/api/hr/users"),
    enabled: isHROrAbove,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiFetch(`/api/hr/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-users"] });
      queryClient.invalidateQueries({ queryKey: ["getMe"] });
      toast({ title: "Role updated successfully" });
    },
    onError: async (err: Error) => {
      toast({
        title: "Failed to update role",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Which roles the current user can assign
  const assignableRoles: string[] = (() => {
    if ((me as any)?.isOwner) return ["super_admin", "hr_admin", "manager", "employee"];
    if (me?.role === "super_admin") return ["hr_admin", "manager", "employee"];
    if (me?.role === "hr_admin") return ["manager", "employee"];
    return [];
  })();

  const filteredUsers = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      ROLE_LABELS[u.role]?.toLowerCase().includes(q)
    );
  });

  if (!isHROrAbove) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground" />
          <h2 className="font-serif text-2xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground max-w-sm">
            User management requires HR Admin or Super Admin access.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div>
          <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {me?.role === "super_admin" || (me as any)?.isOwner
              ? "Assign roles to team members. Super Admins can set HR Admin, Manager, or Employee."
              : "Assign Manager or Employee roles to team members."}
          </p>
        </div>

        {/* Role capability reminder */}
        <div className="flex flex-wrap gap-3">
          {assignableRoles.map((role) => (
            <div
              key={role}
              className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              Can assign: {ROLE_LABELS[role]}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="font-serif text-xl">All Users</CardTitle>
                <CardDescription>
                  {users ? `${users.length} users registered` : "Loading…"}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="pr-6">Assign Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4} className="pl-6">
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : filteredUsers.map((user) => {
                      const isMe = user.clerkId === (me as any)?.clerkId;
                      const canChange =
                        !user.isOwner &&
                        !isMe &&
                        assignableRoles.length > 0 &&
                        // hr_admin cannot change another hr_admin
                        !(me?.role === "hr_admin" && user.role === "hr_admin");

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 overflow-hidden">
                                {user.avatarUrl ? (
                                  <img
                                    src={user.avatarUrl}
                                    alt={user.fullName ?? ""}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  (user.fullName?.charAt(0) ?? user.email?.charAt(0) ?? "?").toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-sm flex items-center gap-1.5">
                                  {user.fullName || "Unknown"}
                                  {user.isOwner && (
                                    <Crown className="h-3 w-3 text-amber-500" />
                                  )}
                                  {isMe && (
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.email || user.clerkId.slice(0, 20)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={ROLE_BADGE_STYLES[user.role] ?? ""}
                            >
                              {ROLE_LABELS[user.role] ?? user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {format(new Date(user.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="pr-6">
                            {canChange ? (
                              <Select
                                value={user.role}
                                onValueChange={(role) =>
                                  roleMutation.mutate({ id: user.id, role })
                                }
                                disabled={roleMutation.isPending}
                              >
                                <SelectTrigger className="w-36 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {assignableRoles.map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {ROLE_LABELS[r]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                {user.isOwner
                                  ? "Platform owner"
                                  : isMe
                                  ? "Cannot change own role"
                                  : "Restricted"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                {!isLoading && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No users found
                      {search ? ` matching "${search}"` : ""}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
