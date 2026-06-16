import { useState } from "react";
import { Link } from "wouter";
import {
  Users,
  CalendarClock,
  Plane,
  Banknote,
  Target,
  FileText,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Bell,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  X,
  Menu,
} from "lucide-react";
import { RosterStrip } from "@/components/roster-strip";

const features = [
  {
    icon: Users,
    title: "Team Directory",
    desc: "A beautifully organized, searchable ledger of everyone in your company — profiles, reporting lines, and contact info in one place.",
  },
  {
    icon: CalendarClock,
    title: "Time & Attendance",
    desc: "Clear, unambiguous records of who is working, when, and where. Clock-in, WFH, and leave all in one view.",
  },
  {
    icon: Plane,
    title: "Leave Management",
    desc: "Simple approval workflows and transparent balances. Employees apply, managers approve — no email chains.",
  },
  {
    icon: Banknote,
    title: "Payroll Structures",
    desc: "Structured data models for basic pay, allowances, and deductions. Generate payslips with one click.",
  },
  {
    icon: Target,
    title: "Performance Reviews",
    desc: "Meaningful evaluation cycles with ratings, goal tracking, and employee acknowledgements that actually help teams grow.",
  },
  {
    icon: FileText,
    title: "Document Vault",
    desc: "Secure, organized storage for company policies and employee records. Always there when HR needs to find something.",
  },
];

const steps = [
  {
    step: "01",
    title: "Set up your organization",
    desc: "Define departments, designations, and leave policies. Invite your team via email to join the workspace in minutes.",
    icon: Zap,
  },
  {
    step: "02",
    title: "Manage day-to-day",
    desc: "Employees check in, request time off, and access their documents. Managers review requests and track attendance in real time.",
    icon: Clock,
  },
  {
    step: "03",
    title: "Grow and review",
    desc: "Conduct performance cycles, set measurable goals, and generate structured payslips based on accurate attendance data.",
    icon: TrendingUp,
  },
];

const stats = [
  { value: "2 min", label: "to add a new employee" },
  { value: "100%", label: "audit trail for every action" },
  { value: "11", label: "HR modules in one workspace" },
  { value: "0", label: "spreadsheets required" },
];

export default function LandingPage() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f2f2f2", color: "#151b31" }}>

      {/* ── Announcement Banner ── */}
      {bannerVisible && (
        <div className="relative w-full flex items-center justify-center gap-2 px-10 py-2.5 text-sm font-medium" style={{ background: "#fedf89", color: "#151b31" }}>
          <span>Roster is now available for early access — your whole team, one workspace.</span>
          <Link href="/sign-up" className="font-semibold underline underline-offset-2 ml-1" style={{ color: "#ff5858" }}>
            Start free →
          </Link>
          <button
            onClick={() => setBannerVisible(false)}
            className="absolute right-4 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: "rgba(242,242,242,0.92)", backdropFilter: "blur(12px)", borderColor: "#e8e7e5" }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 md:px-12">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: "#151b31" }}>
              <span className="font-bold text-white text-sm">R</span>
            </div>
            <span className="font-display text-xl tracking-wide" style={{ color: "#151b31" }}>
              Roster
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/sign-in">
              <button
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                style={{ borderColor: "#e8e7e5", color: "#151b31", background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#e8e7e5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                Sign in
              </button>
            </Link>
            <Link href="/sign-up">
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "#151b31", color: "#ffffff", boxShadow: "rgba(0,0,0,0.1) 0px 1px 3px 0px, rgba(0,0,0,0.06) 0px 1px 2px 0px" }}
              >
                Get started free
              </button>
            </Link>
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg border transition-colors"
            style={{ borderColor: "#e8e7e5", color: "#151b31", background: "transparent" }}
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-5 py-4 flex flex-col gap-2" style={{ borderColor: "#e8e7e5", background: "#f2f2f2" }}>
            <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
              <button
                className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors"
                style={{ borderColor: "#e8e7e5", color: "#151b31", background: "#ffffff" }}
              >
                Sign in
              </button>
            </Link>
            <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
              <button
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg"
                style={{ background: "#151b31", color: "#ffffff" }}
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        )}
      </nav>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="px-5 pt-16 pb-12 md:pt-24 md:pb-20 md:px-12 max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium mb-8"
              style={{ background: "#ffffff", border: "1px solid #e8e7e5", color: "#6d6f75", boxShadow: "rgba(138,133,125,0.2) 0px 1px 4px 0px" }}
            >
              <span className="flex h-1.5 w-1.5 rounded-full" style={{ background: "#ff5858" }} />
              People-ops, simplified
            </div>

            {/* Headline */}
            <h1
              className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight tracking-wide max-w-4xl mb-6"
              style={{ color: "#151b31", letterSpacing: "0.03em" }}
            >
              HR your team will{" "}
              <span style={{ color: "#ff5858" }}>actually love.</span>
            </h1>

            <p className="text-lg md:text-xl max-w-2xl mb-10 leading-relaxed" style={{ color: "#6d6f75" }}>
              A structured, trustworthy people-ops tool for small-to-midsize companies.
              Manage your team, time off, payroll, and performance in one workspace.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-14 w-full sm:w-auto">
              <Link href="/sign-up" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: "#151b31", color: "#ffffff", boxShadow: "rgba(0,0,0,0.1) 0px 1px 3px 0px, rgba(0,0,0,0.06) 0px 1px 2px 0px" }}
                >
                  Start your free trial
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/sign-in" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 text-base font-medium rounded-lg border transition-colors hover:bg-warm-stone"
                  style={{ borderColor: "#e8e7e5", color: "#151b31", background: "transparent" }}
                >
                  Sign in to your account
                </button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-col items-center gap-2.5">
              <RosterStrip size="md" count={6} />
              <p className="text-sm font-mono" style={{ color: "#6d6f75" }}>
                Trusted by modern HR teams
              </p>
            </div>
          </div>
        </section>

        {/* ── App Preview ── */}
        <section className="px-5 md:px-12 pb-20 max-w-6xl mx-auto">
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: "#e8e7e5", boxShadow: "rgba(0,0,0,0.1) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -1px" }}
          >
            {/* Mock browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "#ffffff", borderColor: "#e8e7e5" }}>
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(255,88,88,0.5)" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(254,223,137,0.8)" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(134,224,193,0.8)" }} />
              </div>
              <div className="flex-1 flex justify-center">
                <div
                  className="rounded-md px-4 py-1 text-xs font-mono w-64 text-center border"
                  style={{ background: "#f2f2f2", borderColor: "#e8e7e5", color: "#6d6f75" }}
                >
                  app.roster.hr / dashboard
                </div>
              </div>
            </div>

            {/* Mock dashboard UI */}
            <div className="flex" style={{ height: "340px" }}>
              {/* Sidebar */}
              <div className="hidden md:flex w-52 flex-col shrink-0" style={{ background: "#151b31" }}>
                <div className="flex items-center gap-2 px-4 h-14 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="h-6 w-6 rounded flex items-center justify-center" style={{ background: "#ff5858" }}>
                    <span className="text-white font-bold text-xs">R</span>
                  </div>
                  <span className="font-display text-sm text-white tracking-wide">Roster</span>
                </div>
                <nav className="flex-1 py-4 px-2 space-y-0.5">
                  {[
                    { icon: BarChart3, label: "Dashboard", active: true },
                    { icon: Users, label: "Directory" },
                    { icon: CalendarClock, label: "Attendance" },
                    { icon: Plane, label: "Time Off" },
                    { icon: Banknote, label: "Payroll" },
                    { icon: Target, label: "Performance" },
                    { icon: Bell, label: "Announcements" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium"
                      style={{
                        background: item.active ? "rgba(255,88,88,0.15)" : "transparent",
                        color: item.active ? "#ffffff" : "rgba(255,255,255,0.45)",
                      }}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Dashboard content */}
              <div className="flex-1 p-4 overflow-hidden" style={{ background: "#f2f2f2" }}>
                <div className="mb-4">
                  <div className="h-5 w-44 rounded font-bold flex items-center px-2 mb-1.5" style={{ background: "#151b31" }}>
                    <span className="text-white text-xs">Welcome back, Sarah</span>
                  </div>
                  <div className="h-2.5 w-28 rounded" style={{ background: "#e8e7e5" }} />
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
                  {[
                    { label: "Headcount", val: "142", sub: "+3 this month", accent: "#151b31" },
                    { label: "Present today", val: "128", sub: "90% attendance", accent: "#86e0c1" },
                    { label: "Pending leaves", val: "7", sub: "Needs review", accent: "#fedf89" },
                    { label: "Open reviews", val: "4", sub: "Q2 cycle", accent: "#ff5858" },
                  ].map((card) => (
                    <div key={card.label} className="rounded-lg p-3 border" style={{ background: "#ffffff", borderColor: "#e8e7e5", boxShadow: "rgba(138,133,125,0.2) 0px 1px 4px 0px" }}>
                      <div className="text-[10px] font-medium mb-1" style={{ color: "#6d6f75" }}>{card.label}</div>
                      <div className="text-xl font-mono font-bold" style={{ color: "#151b31" }}>{card.val}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "#6d6f75" }}>{card.sub}</div>
                      <div className="h-0.5 w-8 rounded-full mt-2" style={{ background: card.accent }} />
                    </div>
                  ))}
                </div>

                {/* Bottom section */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2 rounded-lg p-3 border" style={{ background: "#ffffff", borderColor: "#e8e7e5" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#6d6f75" }}>Headcount by dept</div>
                    <div className="space-y-2">
                      {[
                        { name: "Engineering", pct: 78, n: 34 },
                        { name: "Sales", pct: 55, n: 24 },
                        { name: "Operations", pct: 40, n: 18 },
                        { name: "Design", pct: 25, n: 11 },
                      ].map((dept) => (
                        <div key={dept.name} className="flex items-center gap-2">
                          <div className="text-[10px] w-20 shrink-0" style={{ color: "#6d6f75" }}>{dept.name}</div>
                          <div className="flex-1 rounded-full h-1.5" style={{ background: "#e8e7e5" }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${dept.pct}%`, background: "#151b31" }} />
                          </div>
                          <div className="text-[10px] font-mono w-6 text-right" style={{ color: "#6d6f75" }}>{dept.n}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg p-3 border" style={{ background: "#ffffff", borderColor: "#e8e7e5" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#6d6f75" }}>Pending</div>
                    <div className="space-y-2">
                      {[
                        { name: "A. Mehta", type: "Sick leave", days: "2d" },
                        { name: "R. Chen", type: "Annual", days: "5d" },
                        { name: "K. Osei", type: "WFH", days: "1d" },
                      ].map((req) => (
                        <div key={req.name} className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-medium" style={{ color: "#151b31" }}>{req.name}</div>
                            <div className="text-[9px]" style={{ color: "#6d6f75" }}>{req.type}</div>
                          </div>
                          <div className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(254,223,137,0.4)", color: "#151b31" }}>{req.days}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Strip ── */}
        <section className="border-y" style={{ background: "#ffffff", borderColor: "#e8e7e5" }}>
          <div className="max-w-6xl mx-auto px-5 md:px-12 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl md:text-4xl mb-1" style={{ color: "#ff5858", letterSpacing: "0.03em" }}>{stat.value}</div>
                <div className="text-sm" style={{ color: "#6d6f75" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature Grid (Dark) ── */}
        <section className="py-20 md:py-28 px-5 md:px-12" style={{ background: "#151b31" }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-5"
                style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }}
              >
                Everything you need
              </div>
              <h2
                className="font-display text-4xl md:text-6xl mb-4 text-white"
                style={{ letterSpacing: "0.03em" }}
              >
                Nothing you don't.
              </h2>
              <p className="max-w-xl mx-auto text-lg" style={{ color: "rgba(255,255,255,0.6)" }}>
                Designed to feel like a premium internal tool — one your team actually wants to open.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-6 md:p-7 transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "rgba(138,133,125,0.2) 0px 1px 4px 0px",
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg mb-5"
                    style={{ background: "rgba(255,88,88,0.15)" }}
                  >
                    <feature.icon className="h-5 w-5" style={{ color: "#ff5858" }} />
                  </div>
                  <h3 className="font-serif text-lg font-bold mb-2 text-white">{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-20 md:py-28 px-5 md:px-12" style={{ background: "#f2f2f2" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2
                className="font-display text-4xl md:text-6xl mb-4"
                style={{ color: "#151b31", letterSpacing: "0.03em" }}
              >
                Up and running in an afternoon.
              </h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: "#6d6f75" }}>
                No implementation consultants. No weeks of training. Just a clean setup flow and a workspace that makes sense.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <div key={i} className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-full w-full h-px z-0 -translate-x-4" style={{ background: `linear-gradient(to right, #e8e7e5, transparent)` }} />
                  )}
                  <div className="relative z-10 flex flex-col">
                    <div className="flex items-center gap-4 mb-5">
                      <div
                        className="h-12 w-12 rounded-xl font-mono font-bold flex items-center justify-center text-sm shrink-0"
                        style={{ background: "#151b31", color: "#ffffff" }}
                      >
                        {step.step}
                      </div>
                      <div className="h-px flex-1 md:hidden" style={{ background: "#e8e7e5" }} />
                    </div>
                    <h3 className="font-serif text-xl font-bold mb-3" style={{ color: "#151b31" }}>{step.title}</h3>
                    <p className="leading-relaxed text-sm" style={{ color: "#6d6f75" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust / Testimonial ── */}
        <section className="py-16 md:py-20 px-5 md:px-12 border-y" style={{ background: "#ffffff", borderColor: "#e8e7e5" }}>
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              {[
                { icon: Shield, text: "SOC 2 compliant infrastructure" },
                { icon: CheckCircle2, text: "Role-based access control" },
                { icon: BarChart3, text: "Complete audit trail" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-sm" style={{ color: "#6d6f75" }}>
                  <item.icon className="h-4 w-4 shrink-0" style={{ color: "#151b31" }} />
                  {item.text}
                </div>
              ))}
            </div>

            <blockquote
              className="text-xl md:text-2xl font-serif italic max-w-3xl mx-auto mb-6 leading-relaxed"
              style={{ color: "#151b31" }}
            >
              "Finally, an HR tool that feels like it was designed for our team — not built to check a compliance checkbox."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center font-semibold font-mono text-sm"
                style={{ background: "rgba(255,88,88,0.12)", color: "#ff5858" }}
              >
                SM
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold" style={{ color: "#151b31" }}>Sarah M.</div>
                <div className="text-xs font-mono" style={{ color: "#6d6f75" }}>Head of People, Verdant Labs</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA (Dark) ── */}
        <section className="py-24 md:py-32 px-5 text-center" style={{ background: "#151b31" }}>
          <div
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-6"
            style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }}
          >
            No credit card required
          </div>
          <h2
            className="font-display text-4xl md:text-6xl lg:text-7xl mb-6 text-white leading-tight"
            style={{ letterSpacing: "0.03em" }}
          >
            Ready to bring order<br />
            <span style={{ color: "#ff5858" }}>to your HR?</span>
          </h2>
          <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
            Join teams using Roster to build a better, more transparent workplace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up">
              <button
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "#ff5858", color: "#ffffff", boxShadow: "rgba(0,0,0,0.1) 0px 4px 6px -1px" }}
              >
                Create your workspace
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/sign-in">
              <button
                className="inline-flex items-center px-8 py-3.5 text-base font-medium rounded-lg border transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)", background: "transparent" }}
              >
                Sign in instead
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-10 px-5 md:px-12 border-t" style={{ background: "#151b31", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: "rgba(255,88,88,0.25)" }}>
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="font-display text-lg tracking-wide" style={{ color: "rgba(255,255,255,0.8)" }}>Roster</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Link href="/sign-in" className="hover:text-white/80 transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-white/80 transition-colors">Get started</Link>
            <span>© {new Date().getFullYear()} Roster HRMS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
