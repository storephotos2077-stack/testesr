/**
 * Cron routes — called by Vercel Cron or any external scheduler.
 *
 * Protected by `Authorization: Bearer <CRON_SECRET>`.
 * Set CRON_SECRET in your environment to a long random string.
 * Vercel Cron schedule is configured in vercel.json.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, lt, ne, gte, lte } from "drizzle-orm";
import { db, profilesTable, auditLogsTable } from "@workspace/db";
import {
  sendEmail,
  buildPlanExpiredEmail,
  buildPlanExpiringEmail,
} from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function cronAuth(req: Request, res: Response): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In development (no secret configured) allow localhost callers only
    const host = req.headers.host ?? "";
    if (!host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
      res.status(401).json({ error: "CRON_SECRET not configured" });
      return false;
    }
    return true;
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * POST /api/cron/expire-plans
 * Runs daily (see vercel.json):
 *  1. Revokes plans whose planExpiresAt is in the past
 *  2. Sends 7-day expiry warning emails (±1 h window around 7-day mark)
 */
router.post("/cron/expire-plans", async (req: Request, res: Response): Promise<void> => {
  if (!cronAuth(req, res)) return;

  const now = new Date();

  // ── 1. Expire overdue plans ──────────────────────────────────────────────
  const expired = await db
    .select()
    .from(profilesTable)
    .where(and(ne(profilesTable.plan, "free"), lt(profilesTable.planExpiresAt, now)));

  let revokedCount = 0;

  for (const profile of expired) {
    await db
      .update(profilesTable)
      .set({ plan: "free", planExpiresAt: null })
      .where(eq(profilesTable.id, profile.id));

    revokedCount++;

    await db.insert(auditLogsTable).values({
      adminClerkId: "system:cron",
      adminName: "Automated (plan expiry)",
      targetProfileId: profile.id,
      targetName: profile.fullName,
      action: "plan_expired",
      metadata: { previousPlan: profile.plan },
      ipAddress: null,
    }).catch(() => { /* non-critical */ });

    if (profile.email) {
      await sendEmail(buildPlanExpiredEmail({
        to: profile.email,
        fullName: profile.fullName,
        plan: profile.plan,
      }));
    }
  }

  // ── 2. Send 7-day expiry warnings ────────────────────────────────────────
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const windowStart = new Date(in7d.getTime() - 60 * 60 * 1000);
  const windowEnd   = new Date(in7d.getTime() + 60 * 60 * 1000);

  const expiringSoon = await db
    .select()
    .from(profilesTable)
    .where(
      and(
        ne(profilesTable.plan, "free"),
        gte(profilesTable.planExpiresAt, windowStart),
        lte(profilesTable.planExpiresAt, windowEnd),
      ),
    );

  let warnedCount = 0;
  for (const profile of expiringSoon) {
    if (!profile.email || !profile.planExpiresAt) continue;
    const daysLeft = Math.ceil(
      (profile.planExpiresAt.getTime() - now.getTime()) / 86_400_000,
    );
    await sendEmail(buildPlanExpiringEmail({
      to: profile.email,
      fullName: profile.fullName,
      plan: profile.plan,
      expiresAt: profile.planExpiresAt,
      daysLeft,
    }));
    warnedCount++;
  }

  logger.info({ revokedCount, warnedCount }, "cron/expire-plans complete");
  res.json({ ok: true, revokedCount, warnedCount });
});

export default router;
