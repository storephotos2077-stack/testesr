import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, profilesTable, auditLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  sendEmail,
  buildPlanGrantedEmail,
  buildPlanRevokedEmail,
} from "../lib/email";

const router: IRouter = Router();

function isOwner(req: { isOwner?: boolean }): boolean {
  return req.isOwner === true;
}

function getIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string | null {
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  return raw?.split(",")[0]?.trim() || req.ip || null;
}

async function getAdminProfile(clerkId: string) {
  const [p] = await db.select().from(profilesTable).where(eq(profilesTable.clerkId, clerkId));
  return p;
}

async function logAction(opts: {
  adminClerkId: string;
  adminName?: string | null;
  targetProfileId?: number | null;
  targetName?: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  await db.insert(auditLogsTable).values({
    adminClerkId: opts.adminClerkId,
    adminName: opts.adminName ?? null,
    targetProfileId: opts.targetProfileId ?? null,
    targetName: opts.targetName ?? null,
    action: opts.action,
    metadata: opts.metadata ?? null,
    ipAddress: opts.ipAddress ?? null,
  }).catch(() => { /* non-critical */ });
}

// ─── Claim owner ──────────────────────────────────────────────────────────────

router.post("/admin/claim-owner", requireAuth, async (req, res): Promise<void> => {
  const superOwnerClerkId = process.env.SUPER_OWNER_CLERK_ID;

  if (!superOwnerClerkId) {
    res.status(400).json({ error: "SUPER_OWNER_CLERK_ID is not configured on this server." });
    return;
  }
  if (req.userId !== superOwnerClerkId) {
    res.status(403).json({ error: "Your account is not designated as the platform owner." });
    return;
  }

  const [updated] = await db
    .update(profilesTable)
    .set({ isOwner: true, role: "super_admin" })
    .where(eq(profilesTable.clerkId, req.userId!))
    .returning();

  await logAction({
    adminClerkId: req.userId!,
    adminName: updated.fullName,
    action: "claim_owner",
    ipAddress: getIp(req),
  });

  res.json({
    id: updated.id,
    clerkId: updated.clerkId,
    email: updated.email,
    fullName: updated.fullName,
    role: updated.role,
    isOwner: updated.isOwner,
    plan: updated.plan,
  });
});

// ─── List users ───────────────────────────────────────────────────────────────

router.get("/admin/users", requireAuth, async (req, res): Promise<void> => {
  if (!isOwner(req)) { res.status(403).json({ error: "Owner access required" }); return; }

  const profiles = await db.select().from(profilesTable).orderBy(profilesTable.createdAt);

  res.json(profiles.map((p) => ({
    id: p.id,
    clerkId: p.clerkId,
    email: p.email,
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    role: p.role,
    isOwner: p.isOwner,
    plan: p.plan,
    planExpiresAt: p.planExpiresAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  })));
});

// ─── Grant plan ───────────────────────────────────────────────────────────────

router.post("/admin/users/:id/grant-plan", requireAuth, async (req, res): Promise<void> => {
  if (!isOwner(req)) { res.status(403).json({ error: "Owner access required" }); return; }

  const profileId = Number(req.params.id);
  const { plan, durationDays } = req.body as { plan: string; durationDays?: number };

  if (!["free", "starter", "pro", "enterprise"].includes(plan)) {
    res.status(400).json({ error: "Invalid plan. Choose: free, starter, pro, enterprise" });
    return;
  }

  let planExpiresAt: Date | null = null;
  if (plan !== "free" && durationDays && durationDays > 0) {
    planExpiresAt = new Date();
    planExpiresAt.setDate(planExpiresAt.getDate() + durationDays);
  }

  const [updated] = await db
    .update(profilesTable)
    .set({ plan: plan as "free" | "starter" | "pro" | "enterprise", planExpiresAt: planExpiresAt ?? undefined })
    .where(eq(profilesTable.id, profileId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  const admin = await getAdminProfile(req.userId!);
  await logAction({
    adminClerkId: req.userId!,
    adminName: admin?.fullName,
    targetProfileId: profileId,
    targetName: updated.fullName,
    action: "grant_plan",
    metadata: { plan, durationDays: durationDays ?? null },
    ipAddress: getIp(req),
  });

  // Email the user about their new plan (fire-and-forget)
  if (updated.email) {
    sendEmail(buildPlanGrantedEmail({
      to: updated.email,
      fullName: updated.fullName,
      plan,
      durationDays: durationDays ?? null,
    })).catch(() => {});
  }

  res.json({ id: updated.id, plan: updated.plan, planExpiresAt: updated.planExpiresAt?.toISOString() ?? null });
});

// ─── Revoke plan ──────────────────────────────────────────────────────────────

router.post("/admin/users/:id/revoke-plan", requireAuth, async (req, res): Promise<void> => {
  if (!isOwner(req)) { res.status(403).json({ error: "Owner access required" }); return; }

  const profileId = Number(req.params.id);

  const [current] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!current) { res.status(404).json({ error: "User not found" }); return; }

  const previousPlan = current.plan;

  const [updated] = await db
    .update(profilesTable)
    .set({ plan: "free", planExpiresAt: null })
    .where(eq(profilesTable.id, profileId))
    .returning();

  const admin = await getAdminProfile(req.userId!);
  await logAction({
    adminClerkId: req.userId!,
    adminName: admin?.fullName,
    targetProfileId: profileId,
    targetName: updated.fullName,
    action: "revoke_plan",
    metadata: { previousPlan },
    ipAddress: getIp(req),
  });

  if (updated.email) {
    sendEmail(buildPlanRevokedEmail({
      to: updated.email,
      fullName: updated.fullName,
      previousPlan,
    })).catch(() => {});
  }

  res.json({ id: updated.id, plan: updated.plan, planExpiresAt: null });
});

// ─── Change role ──────────────────────────────────────────────────────────────

router.patch("/admin/users/:id/role", requireAuth, async (req, res): Promise<void> => {
  if (!isOwner(req)) { res.status(403).json({ error: "Owner access required" }); return; }

  const profileId = Number(req.params.id);
  const { role } = req.body as { role: string };

  if (!["super_admin", "hr_admin", "manager", "employee"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [updated] = await db
    .update(profilesTable)
    .set({ role: role as "super_admin" | "hr_admin" | "manager" | "employee" })
    .where(eq(profilesTable.id, profileId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  const admin = await getAdminProfile(req.userId!);
  await logAction({
    adminClerkId: req.userId!,
    adminName: admin?.fullName,
    targetProfileId: profileId,
    targetName: updated.fullName,
    action: "change_role",
    metadata: { role },
    ipAddress: getIp(req),
  });

  res.json({ id: updated.id, role: updated.role });
});

// ─── Audit log ────────────────────────────────────────────────────────────────

router.get("/admin/audit-logs", requireAuth, async (req, res): Promise<void> => {
  if (!isOwner(req)) { res.status(403).json({ error: "Owner access required" }); return; }

  const limitParam = Number(req.query.limit) || 100;
  const limit = Math.min(limitParam, 500);

  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

  res.json(logs.map((l) => ({
    id: l.id,
    adminClerkId: l.adminClerkId,
    adminName: l.adminName,
    targetProfileId: l.targetProfileId,
    targetName: l.targetName,
    action: l.action,
    metadata: l.metadata,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
  })));
});

export default router;
