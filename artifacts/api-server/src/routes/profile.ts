import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable, employeesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/profile/me", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.clerkId, req.userId!));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({
    id: profile.id,
    clerkId: profile.clerkId,
    email: profile.email,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    employeeId: profile.employeeId,
    isOwner: profile.isOwner,
    plan: profile.plan,
    planExpiresAt: profile.planExpiresAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
  });
});

router.patch("/profile/me", requireAuth, async (req, res): Promise<void> => {
  const { fullName, avatarUrl } = req.body;

  // Validate avatarUrl: must be http/https or null/undefined
  if (avatarUrl !== null && avatarUrl !== undefined && avatarUrl !== "") {
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        res.status(400).json({ error: "avatarUrl must be an http or https URL" });
        return;
      }
    } catch {
      res.status(400).json({ error: "avatarUrl must be a valid URL" });
      return;
    }
  }

  const [updated] = await db
    .update(profilesTable)
    .set({ fullName, avatarUrl: avatarUrl || null })
    .where(eq(profilesTable.clerkId, req.userId!))
    .returning();

  res.json({
    id: updated.id,
    clerkId: updated.clerkId,
    email: updated.email,
    fullName: updated.fullName,
    avatarUrl: updated.avatarUrl,
    role: updated.role,
    employeeId: updated.employeeId,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
