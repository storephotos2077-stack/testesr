import { pgTable, text, serial, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["super_admin", "hr_admin", "manager", "employee"]);
export const planEnum = pgEnum("plan", ["free", "starter", "pro", "enterprise"]);

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  role: roleEnum("role").notNull().default("employee"),
  employeeId: integer("employee_id"),
  isOwner: boolean("is_owner").notNull().default(false),
  plan: planEnum("plan").notNull().default("free"),
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
