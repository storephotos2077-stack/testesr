import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const announcementReadsTable = pgTable(
  "announcement_reads",
  {
    id: serial("id").primaryKey(),
    announcementId: integer("announcement_id").notNull(),
    profileId: integer("profile_id").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("announcement_reads_unique").on(table.announcementId, table.profileId)],
);

export const insertAnnouncementReadSchema = createInsertSchema(announcementReadsTable).omit({ id: true, seenAt: true });
export type InsertAnnouncementRead = z.infer<typeof insertAnnouncementReadSchema>;
export type AnnouncementRead = typeof announcementReadsTable.$inferSelect;
