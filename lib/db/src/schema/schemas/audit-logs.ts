import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminClerkId: text("admin_clerk_id").notNull(),
  adminName: text("admin_name"),
  targetProfileId: integer("target_profile_id"),
  targetName: text("target_name"),
  action: text("action").notNull(),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
