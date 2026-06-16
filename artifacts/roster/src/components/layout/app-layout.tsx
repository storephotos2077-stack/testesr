import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetMe, useUpdateMe, useListAnnouncements } from "@workspace/api-client-react";

import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CalendarClock, 
  Banknote, 
  Target, 
  FileText, 
  Bell, 
  Network, 
  PieChart, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Crown,
  UserPen,
  UserCog,
  CheckSquare,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const ANNOUNCEMENTS_LAST_SEEN_KEY = "roster:announcements:lastSeen";

// ── Nav item definition ──────────────────────────────────────────────────────
interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  // Which roles can see this item. Empty = all authenticated users.
  roles?: string[];
}

// Items visible to all authenticated users
const coreNavItems: NavItem[] = [
  { href: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/employees", icon: Users, label: "Directory" },
  { href: "/app/attendance", icon: CalendarClock, label: "Attendance" },
  { href: "/app/leave", icon: Calendar, label: "Time Off" },
  { href: "/app/payroll", icon: Banknote, label: "Payroll" },
  { href: "/app/documents", icon: FileText, label: "Documents" },
  { href: "/app/announcements", icon: Bell, label: "Announcements" },
  { href: "/app/org-chart", icon: Network, label: "Org Chart" },
];

// Extra items visible to managers and above
const managerNavItems: NavItem[] = [
  { href: "/app/leave/approvals", icon: CheckSquare, label: "Leave Approvals" },
  { href: "/app/attendance/team", icon: UsersRound, label: "Team Attendance" },
  { href: "/app/performance", icon: Target, label: "Performance" },
];

// Admin items (HR Admin and Super Admin only)
const adminNavItems: NavItem[] = [
  { href: "/app/reports", icon: PieChart, label: "Reports" },
  { href: "/app/settings", icon: Settings, label: "Settings" },
];

// HR management item (HR Admin and Super Admin)
const hrNavItems: NavItem[] = [
  { href: "/app/settings/users", icon: UserCog, label: "User Roles" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: profile } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [profileDialog, setProfileDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: "", avatarUrl: "" });

  const updateMe = useUpdateMe({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getMe"] });
        setProfileDialog(false);
        toast({ title: "Profile updated" });
      },
      onError: () => {
        toast({ title: "Failed to update profile", variant: "destructive" });
      },
    },
  });

  // ── Announcement unread badge + "What's New" toast ──────────────────────
  const { data: announcements } = useListAnnouncements(
    {},
    { query: { refetchInterval: 30_000 } }
  );

  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    const stored = localStorage.getItem(ANNOUNCEMENTS_LAST_SEEN_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  const knownIdsRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (location.startsWith("/app/announcements")) {
      const now = Date.now();
      localStorage.setItem(ANNOUNCEMENTS_LAST_SEEN_KEY, String(now));
      setLastSeenAt(now);
      if (announcements) {
        knownIdsRef.current = new Set(announcements.map((a) => a.id));
      }
    }
  }, [location, announcements]);

  useEffect(() => {
    if (!announcements || announcements.length === 0) return;

    if (knownIdsRef.current === null) {
      knownIdsRef.current = new Set(announcements.map((a) => a.id));
      return;
    }

    const newOnes = announcements.filter((a) => !knownIdsRef.current!.has(a.id));
    if (newOnes.length === 0) return;

    knownIdsRef.current = new Set(announcements.map((a) => a.id));

    if (location.startsWith("/app/announcements")) return;

    const latest = newOnes[newOnes.length - 1];
    const title = newOnes.length === 1
      ? `📣 ${latest.title}`
      : `📣 ${newOnes.length} new announcements`;
    const description = newOnes.length === 1
      ? (latest.content?.slice(0, 80) + (latest.content?.length > 80 ? "…" : ""))
      : "Tap to read the latest updates from your team.";

    toast({
      title,
      description,
      duration: 6000,
      action: (
        <button
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#ff5858", color: "#ffffff" }}
          onClick={() => setLocation("/app/announcements")}
        >
          View
        </button>
      ) as any,
    });
  }, [announcements]);

  const unreadCount = announcements
    ? announcements.filter((a) => new Date(a.createdAt).getTime() > lastSeenAt).length
    : 0;
  // ─────────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    signOut({ redirectUrl: "/" });
  };

  const openProfileDialog = () => {
    setProfileForm({
      fullName: profile?.fullName ?? user?.fullName ?? "",
      avatarUrl: profile?.avatarUrl ?? user?.imageUrl ?? "",
    });
    setProfileDialog(true);
  };

  // ── Role helpers ──────────────────────────────────────────────────────────
  const role = profile?.role ?? "employee";
  const isOwner = !!(profile as any)?.isOwner;
  const isAdmin = role === "super_admin" || role === "hr_admin";
  const isManagerOrAbove = isAdmin || role === "manager";

  const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin",
    hr_admin: "HR Admin",
    manager: "Manager",
    employee: "Employee",
  };

  const ROLE_BADGE_COLORS: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700",
    hr_admin: "bg-primary/10 text-primary",
    manager: "bg-[#4C7A8C]/10 text-[#4C7A8C]",
    employee: "bg-muted text-muted-foreground",
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300">
      <div className={cn("flex h-16 items-center px-4 border-b border-sidebar-border", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Roster Logo" className="h-8 w-8" />
            <span className="font-serif text-xl font-bold tracking-tight">Roster</span>
          </div>
        )}
        {collapsed && <img src="/logo.svg" alt="Roster Logo" className="h-8 w-8" />}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {/* Core navigation — all users */}
        <nav className="space-y-1 px-2">
          {coreNavItems.map((item) => {
            const isActive = location.startsWith(item.href);
            const isAnnouncements = item.href === "/app/announcements";
            const badge = isAnnouncements && unreadCount > 0 ? unreadCount : 0;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                )}>
                  <span className="relative shrink-0">
                    <item.icon className="h-5 w-5" />
                    {badge > 0 && collapsed && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full" style={{ background: "#ff5858" }} />
                    )}
                  </span>
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {badge > 0 && !collapsed && (
                    <span
                      className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold leading-none"
                      style={{ background: "#ff5858", color: "#ffffff" }}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Manager+ items */}
        {isManagerOrAbove && (
          <>
            {!collapsed && (
              <div className="mt-5 mb-2 px-6 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Team
              </div>
            )}
            {collapsed && <div className="mt-5 mb-2 border-t border-sidebar-border mx-4" />}
            <nav className="space-y-1 px-2">
              {managerNavItems.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                    )}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        {/* HR Admin+ section */}
        {isAdmin && (
          <>
            {!collapsed && (
              <div className="mt-5 mb-2 px-6 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Administration
              </div>
            )}
            {collapsed && <div className="mt-5 mb-2 border-t border-sidebar-border mx-4" />}
            <nav className="space-y-1 px-2">
              {adminNavItems.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                    )}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
              {hrNavItems.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                    )}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
              {isOwner && (
                <Link href="/app/admin">
                  <div className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    location.startsWith("/app/admin")
                      ? "bg-amber-500/20 text-amber-700"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-amber-600"
                  )}>
                    <Crown className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Owner Console</span>}
                  </div>
                </Link>
              )}
            </nav>
          </>
        )}

        {/* Owner Console when not already shown in Admin section (edge: owner without admin role) */}
        {isOwner && !isAdmin && (
          <>
            {!collapsed && <div className="mt-5 mb-2 px-6 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Administration</div>}
            {collapsed && <div className="mt-5 mb-2 border-t border-sidebar-border mx-4" />}
            <nav className="space-y-1 px-2">
              <Link href="/app/admin">
                <div className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  location.startsWith("/app/admin")
                    ? "bg-amber-500/20 text-amber-700"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-amber-600"
                )}>
                  <Crown className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Owner Console</span>}
                </div>
              </Link>
            </nav>
          </>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-4">
        {/* Role badge */}
        {!collapsed && profile && (
          <div className="mb-3 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                ROLE_BADGE_COLORS[role] ?? "bg-muted text-muted-foreground"
              )}
            >
              {isOwner ? "Owner" : ROLE_LABELS[role] ?? role}
            </span>
          </div>
        )}
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
          <button
            className={cn("flex items-center gap-3 flex-1 min-w-0 rounded-md px-1 py-1 hover:bg-sidebar-accent transition-colors text-left", collapsed && "hidden")}
            onClick={openProfileDialog}
            title="Edit profile"
          >
            <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold shrink-0 overflow-hidden">
              {(profile?.avatarUrl || user?.imageUrl) ? (
                <img src={profile?.avatarUrl ?? user?.imageUrl} alt={profile?.fullName || user?.fullName || "User"} className="h-full w-full object-cover" />
              ) : (
                (profile?.fullName ?? user?.firstName)?.charAt(0) || "U"
              )}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium truncate">{profile?.fullName || user?.fullName || "User"}</span>
              <span className="text-xs text-sidebar-foreground/60 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
            <UserPen className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
          </button>
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={openProfileDialog}
              title="Edit profile"
            >
              <UserPen className="h-5 w-5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-serif text-xl">Edit Profile</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMe.mutate({
              data: {
                fullName: profileForm.fullName || undefined,
                avatarUrl: profileForm.avatarUrl || null,
              },
            });
          }}
          className="space-y-4 mt-2"
        >
          <div className="space-y-1.5">
            <Label>Display Name</Label>
            <Input
              placeholder="Your full name"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Avatar URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="https://..."
              value={profileForm.avatarUrl}
              onChange={(e) => setProfileForm((f) => ({ ...f, avatarUrl: e.target.value }))}
            />
            {profileForm.avatarUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img src={profileForm.avatarUrl} alt="Preview" className="h-10 w-10 rounded-full object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setProfileDialog(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMe.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {updateMe.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:block relative transition-all duration-300 z-10 shrink-0",
        collapsed ? "w-[72px]" : "w-64"
      )}>
        <SidebarContent />
        <Button
          variant="secondary"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border shadow-sm z-20"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Roster Logo" className="h-8 w-8" />
            <span className="font-serif text-xl font-bold tracking-tight">Roster</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
