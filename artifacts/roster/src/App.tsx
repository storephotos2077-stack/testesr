import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import EmployeesPage from "@/pages/employees";
import NewEmployeePage from "@/pages/employees/new";
import EmployeeProfile from "@/pages/employees/[id]";
import AttendancePage from "@/pages/attendance";
import TeamAttendancePage from "@/pages/attendance/team";
import LeavePage from "@/pages/leave";
import LeaveApprovalsPage from "@/pages/leave/approvals";
import LeaveCalendarPage from "@/pages/leave/calendar";
import PayrollPage from "@/pages/payroll";
import PayrollManagePage from "@/pages/payroll/manage";
import PerformancePage from "@/pages/performance";
import PerformanceTeamPage from "@/pages/performance/team";
import DocumentsPage from "@/pages/documents";
import AnnouncementsPage from "@/pages/announcements";
import OrgChartPage from "@/pages/org-chart";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import SettingsRolesPage from "@/pages/settings/roles";
import SettingsUsersPage from "@/pages/settings/users";
import AdminPage from "@/pages/admin";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#151b31",
    colorForeground: "#151b31",
    colorMutedForeground: "#6d6f75",
    colorDanger: "#ff5858",
    colorBackground: "#ffffff",
    colorInput: "#f2f2f2",
    colorInputForeground: "#151b31",
    colorNeutral: "#e8e7e5",
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-xl w-[440px] max-w-full overflow-hidden border shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-2xl tracking-tight text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "font-medium text-foreground",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-primary",
    alertText: "text-destructive font-medium",
    logoBox: "h-12 flex justify-center mb-6",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-border hover:bg-muted/50",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
    formFieldInput: "bg-background border-border text-foreground focus:ring-ring focus:border-ring",
    footerAction: "bg-muted/50 p-4 -mx-8 -mb-8 mt-6 border-t",
    dividerLine: "bg-border",
    alert: "border-destructive/20 bg-destructive/10 text-destructive",
    otpCodeFieldInput: "border-border focus:ring-ring focus:border-ring",
    formFieldRow: "mb-4",
    main: "p-8",
  },
};

function AuthPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f2f2f2" }}>
      {/* Minimal nav */}
      <nav className="flex items-center justify-between px-5 py-3.5 md:px-12 border-b" style={{ borderColor: "#e8e7e5", background: "rgba(242,242,242,0.92)" }}>
        <a href={basePath || "/"} className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "#151b31" }}>
            <span className="font-bold text-white text-sm">R</span>
          </div>
          <span style={{ fontFamily: '"Bagel Fat One", cursive', fontSize: "1.25rem", color: "#151b31", letterSpacing: "0.03em" }}>
            Roster
          </span>
        </a>
      </nav>
      {/* Auth card */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageWrapper>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthPageWrapper>
  );
}

function SignUpPage() {
  return (
    <AuthPageWrapper>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthPageWrapper>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType; path: string }) {
  return (
    <Route {...rest}>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </Route>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to Roster",
            subtitle: "Sign in to access your dashboard",
          },
        },
        signUp: {
          start: {
            title: "Join Roster",
            subtitle: "Set up your HR workspace",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />

          {/* Core HR modules */}
          <ProtectedRoute path="/app/dashboard" component={Dashboard} />
          <ProtectedRoute path="/app/employees" component={EmployeesPage} />
          <ProtectedRoute path="/app/employees/new" component={NewEmployeePage} />
          <ProtectedRoute path="/app/employees/:id" component={EmployeeProfile} />
          <ProtectedRoute path="/app/attendance" component={AttendancePage} />
          <ProtectedRoute path="/app/attendance/team" component={TeamAttendancePage} />
          <ProtectedRoute path="/app/leave" component={LeavePage} />
          <ProtectedRoute path="/app/leave/approvals" component={LeaveApprovalsPage} />
          <ProtectedRoute path="/app/leave/calendar" component={LeaveCalendarPage} />
          <ProtectedRoute path="/app/payroll" component={PayrollPage} />
          <ProtectedRoute path="/app/payroll/manage" component={PayrollManagePage} />
          <ProtectedRoute path="/app/performance" component={PerformancePage} />
          <ProtectedRoute path="/app/performance/team" component={PerformanceTeamPage} />
          <ProtectedRoute path="/app/documents" component={DocumentsPage} />
          <ProtectedRoute path="/app/announcements" component={AnnouncementsPage} />
          <ProtectedRoute path="/app/org-chart" component={OrgChartPage} />
          <ProtectedRoute path="/app/reports" component={ReportsPage} />
          <ProtectedRoute path="/app/settings" component={SettingsPage} />
          <ProtectedRoute path="/app/settings/roles" component={SettingsRolesPage} />
          <ProtectedRoute path="/app/settings/users" component={SettingsUsersPage} />
          <ProtectedRoute path="/app/admin" component={AdminPage} />

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
