import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const designationsTable = pgTable("designations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDesignationSchema = createInsertSchema(designationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDesignation = z.infer<typeof insertDesignationSchema>;
export type Designation = typeof designationsTable.$inferSelect;
