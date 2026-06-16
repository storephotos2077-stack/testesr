import { logger } from "./logger";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safe(value: string | null | undefined): string {
  return value ? escapeHtml(value) : "—";
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.FROM_EMAIL ?? "Roster <noreply@resend.dev>";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.info({ subject: payload.subject, to: payload.to }, "Email skipped: RESEND_API_KEY not set");
    return;
  }
  if (!payload.to) {
    logger.warn({ subject: payload.subject }, "Email skipped: no recipient address");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error({ status: res.status, error: err, subject: payload.subject }, "Resend API error");
    } else {
      logger.info({ subject: payload.subject, to: payload.to }, "Email sent");
    }
  } catch (err) {
    logger.error({ err, subject: payload.subject }, "Email send failed");
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

const base = (body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Roster</title>
<style>
  body { margin: 0; padding: 0; background: #f5f4f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .header { background: #1e3a2f; padding: 28px 32px; }
  .header h1 { margin: 0; color: #fff; font-size: 20px; letter-spacing: -0.3px; }
  .body { padding: 32px; color: #374151; line-height: 1.6; }
  .body h2 { margin: 0 0 12px; font-size: 18px; color: #111; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 13px; font-weight: 600; background: #dcfce7; color: #166534; }
  .badge.warn { background: #fef9c3; color: #854d0e; }
  .badge.danger { background: #fee2e2; color: #991b1b; }
  .detail { background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-size: 14px; }
  .detail p { margin: 4px 0; }
  .detail strong { color: #111; }
  .footer { padding: 20px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  a.btn { display: inline-block; padding: 10px 20px; background: #1e3a2f; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; margin-top: 16px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header"><h1>🌿 Roster</h1></div>
  <div class="body">${body}</div>
  <div class="footer">This is an automated message from your Roster platform. Do not reply to this email.</div>
</div>
</body>
</html>`;

export function buildNewUserEmail(user: { email: string; fullName?: string | null }): EmailPayload {
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL ?? "";
  return {
    to: ownerEmail,
    subject: `New user signed up: ${user.fullName ?? user.email}`,
    html: base(`
      <h2>New user signed up</h2>
      <p>A new account was just created on your Roster platform.</p>
      <div class="detail">
        <p><strong>Name:</strong> ${safe(user.fullName)}</p>
        <p><strong>Email:</strong> ${safe(user.email)}</p>
      </div>
      <p>You can manage their role and plan from the Owner Console.</p>
    `),
  };
}

export function buildPlanGrantedEmail(opts: {
  to: string;
  fullName?: string | null;
  plan: string;
  durationDays?: number | null;
}): EmailPayload {
  const planLabel = opts.plan.charAt(0).toUpperCase() + opts.plan.slice(1);
  const expiryNote = opts.durationDays
    ? `This plan is valid for <strong>${opts.durationDays} days</strong>.`
    : "This plan has <strong>no expiry date</strong>.";

  return {
    to: opts.to,
    subject: `You've been granted ${planLabel} plan access on Roster`,
    html: base(`
      <h2>Your plan has been upgraded 🎉</h2>
      <p>Hi ${safe(opts.fullName) !== "—" ? safe(opts.fullName) : "there"},</p>
      <p>The platform owner has granted you access to the <span class="badge">${escapeHtml(planLabel)}</span> plan.</p>
      <div class="detail">
        <p><strong>Plan:</strong> ${escapeHtml(planLabel)}</p>
        <p><strong>Duration:</strong> ${expiryNote.replace(/<[^>]+>/g, "")}</p>
      </div>
      <p>${expiryNote}</p>
      <p>Sign in to your Roster account to access all features included in your plan.</p>
    `),
  };
}

export function buildPlanRevokedEmail(opts: {
  to: string;
  fullName?: string | null;
  previousPlan: string;
}): EmailPayload {
  const planLabel = opts.previousPlan.charAt(0).toUpperCase() + opts.previousPlan.slice(1);
  return {
    to: opts.to,
    subject: `Your Roster ${planLabel} plan has been revoked`,
    html: base(`
      <h2>Plan access updated</h2>
      <p>Hi ${safe(opts.fullName) !== "—" ? safe(opts.fullName) : "there"},</p>
      <p>Your <span class="badge danger">${escapeHtml(planLabel)}</span> plan access on Roster has been revoked. Your account has been moved to the Free tier.</p>
      <p>If you believe this was a mistake, please contact your platform administrator.</p>
    `),
  };
}

export function buildPlanExpiringEmail(opts: {
  to: string;
  fullName?: string | null;
  plan: string;
  expiresAt: Date;
  daysLeft: number;
}): EmailPayload {
  const planLabel = opts.plan.charAt(0).toUpperCase() + opts.plan.slice(1);
  const expiryDate = opts.expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return {
    to: opts.to,
    subject: `Your Roster ${planLabel} plan expires in ${opts.daysLeft} day${opts.daysLeft !== 1 ? "s" : ""}`,
    html: base(`
      <h2>Your plan is expiring soon <span class="badge warn">⚠ ${escapeHtml(String(opts.daysLeft))}d left</span></h2>
      <p>Hi ${safe(opts.fullName) !== "—" ? safe(opts.fullName) : "there"},</p>
      <p>Your <strong>${escapeHtml(planLabel)}</strong> plan on Roster will expire on <strong>${escapeHtml(expiryDate)}</strong>.</p>
      <div class="detail">
        <p><strong>Plan:</strong> ${escapeHtml(planLabel)}</p>
        <p><strong>Expires:</strong> ${escapeHtml(expiryDate)}</p>
      </div>
      <p>After expiry your account will automatically revert to the Free plan. Contact your platform administrator to renew.</p>
    `),
  };
}

export function buildPlanExpiredEmail(opts: {
  to: string;
  fullName?: string | null;
  plan: string;
}): EmailPayload {
  const planLabel = opts.plan.charAt(0).toUpperCase() + opts.plan.slice(1);
  return {
    to: opts.to,
    subject: `Your Roster ${planLabel} plan has expired`,
    html: base(`
      <h2>Plan expired</h2>
      <p>Hi ${safe(opts.fullName) !== "—" ? safe(opts.fullName) : "there"},</p>
      <p>Your <span class="badge danger">${escapeHtml(planLabel)}</span> plan on Roster has expired. Your account has been automatically moved to the Free tier.</p>
      <p>Contact your platform administrator to renew your access.</p>
    `),
  };
}
