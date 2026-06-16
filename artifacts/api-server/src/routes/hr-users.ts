import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, profilesTable, auditLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import type { Request, Response, NextFunction } from "express";

const router: IRouter = Router();

// ─── Role hierarchy ────────────────────────────────────────────────────────────
// What roles each level is allowed to assign to others
const ASSIGNABLE_ROLES: Record<string, string[]> = {
  super_admin: ["hr_admin", "manager", "employee"],
  hr_admin: ["manager", "employee"],
};

const VALID_ROLES = ["super_admin", "hr_admin", "manager", "employee"];

// ─── Middleware: must be hr_admin or super_admin ───────────────────────────────
function requireHROrAbove(req: Request, res: Response, next: NextFunction): void {
  if (!req.role || !["hr_admin", "super_admin"].includes(req.role)) {
    res.status(403).json({ error: "HR Admin or Super Admin access required" });
    return;
  }
  next();
}

// ─── GET /hr/users ─────────────────────────────────────────────────────────────
router.get("/hr/users", requireAuth, requireHROrAbove, async (req, res): Promise<void> => {
  const profiles = await db
    .select()
    .from(profilesTable)
    .orderBy(profilesTable.createdAt);

  res.json(
    profiles.map((p) => ({
      id: p.id,
      clerkId: p.clerkId,
      email: p.email,
      fullName: p.fullName,
      avatarUrl: p.avatarUrl,
      role: p.role,
      isOwner: p.isOwner,
      createdAt: p.createdAt.toISOString(),
    })),
  );
});

// ─── PATCH /hr/users/:id/role ──────────────────────────────────────────────────
router.patch("/hr/users/:id/role", requireAuth, requireHROrAbove, async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.id as string, 10);
  if (isNaN(profileId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const { role } = req.body as { role: string };

  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ error: `Invalid role. Valid roles: ${VALID_ROLES.join(", ")}` });
    return;
  }

  // Determine what the requester is allowed to assign
  const assignerRole = req.role!;
  const assignerIsOwner = req.isOwner === true;

  const allowedToAssign = assignerIsOwner
    ? VALID_ROLES
    : (ASSIGNABLE_ROLES[assignerRole] ?? []);

  if (!allowedToAssign.includes(role)) {
    res.status(403).json({
      error: `Your role (${assignerRole}) is not permitted to assign the '${role}' role`,
    });
    return;
  }

  // Fetch the target profile
  const [target] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, profileId));

  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Cannot change the owner's role
  if (target.isOwner) {
    res.status(403).json({ error: "Cannot change the role of the platform owner" });
    return;
  }

  // HR admin cannot change another hr_admin's role
  if (assignerRole === "hr_admin" && target.role === "hr_admin") {
    res.status(403).json({ error: "HR Admin cannot change another HR Admin's role" });
    return;
  }

  // Cannot change your own role through this endpoint
  if (target.clerkId === req.userId) {
    res.status(403).json({ error: "You cannot change your own role" });
    return;
  }

  const [updated] = await db
    .update(profilesTable)
    .set({ role: role as "super_admin" | "hr_admin" | "manager" | "employee" })
    .where(eq(profilesTable.id, profileId))
    .returning();

  // Audit log (best-effort)
  await db
    .insert(auditLogsTable)
    .values({
      adminClerkId: req.userId!,
      adminName: null,
      targetProfileId: profileId,
      targetName: target.fullName,
      action: "change_role",
      metadata: { role, previousRole: target.role, changedBy: assignerRole },
      ipAddress: null,
    })
    .catch(() => {});

  res.json({ id: updated.id, role: updated.role });
});

export default router;
