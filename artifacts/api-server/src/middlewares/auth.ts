import { getAuth } from "@clerk/express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { sendEmail, buildNewUserEmail } from "../lib/email";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      profileId?: number;
      role?: string;
      employeeId?: number | null;
      isOwner?: boolean;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const clerkId = auth?.userId;

  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.userId = clerkId;

  // Auto-upsert profile
  let [profile] = await db.select().from(profilesTable).where(eq(profilesTable.clerkId, clerkId));

  if (!profile) {
    const email = auth.sessionClaims?.email as string | undefined;
    const fullName = (auth.sessionClaims?.firstName && auth.sessionClaims?.lastName)
      ? `${auth.sessionClaims.firstName} ${auth.sessionClaims.lastName}`
      : undefined;

    const superOwnerClerkId = process.env.SUPER_OWNER_CLERK_ID;
    const isDesignatedOwner = superOwnerClerkId && clerkId === superOwnerClerkId;

    const [existingProfile] = await db.select().from(profilesTable).limit(1);
    const role = isDesignatedOwner || !existingProfile ? "super_admin" : "employee";

    const [newProfile] = await db
      .insert(profilesTable)
      .values({
        clerkId,
        email: email ?? null,
        fullName: fullName ?? null,
        role: role as "super_admin" | "hr_admin" | "manager" | "employee",
        isOwner: isDesignatedOwner ? true : false,
      })
      .returning();
    profile = newProfile;

    // Notify owner of new signup (fire-and-forget)
    if (email && !isDesignatedOwner) {
      const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
      if (ownerEmail) {
        sendEmail(buildNewUserEmail({ email, fullName })).catch(() => {});
      }
    }
  } else {
    const superOwnerClerkId = process.env.SUPER_OWNER_CLERK_ID;
    if (superOwnerClerkId && clerkId === superOwnerClerkId && !profile.isOwner) {
      const [updated] = await db
        .update(profilesTable)
        .set({ isOwner: true, role: "super_admin" })
        .where(eq(profilesTable.clerkId, clerkId))
        .returning();
      profile = updated;
    }
  }

  req.profileId = profile.id;
  req.role = profile.role;
  req.employeeId = profile.employeeId;
  req.isOwner = profile.isOwner;

  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      if (!req.role || !roles.includes(req.role)) {
        res.status(403).json({ error: "Forbidden: insufficient permissions" });
        return;
      }
      next();
    });
  };
}

export const isHR = requireRole("hr_admin", "super_admin");
export const isManager = requireRole("manager", "hr_admin", "super_admin");
