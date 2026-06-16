import { pgTable, text, serial, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const performanceReviewsTable = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(),
  rating: integer("rating").notNull(),
  period: text("period").notNull(),
  strengths: text("strengths"),
  improvements: text("improvements"),
  employeeComment: text("employee_comment"),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: date("target_date", { mode: "string" }).notNull(),
  progress: integer("progress").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPerformanceReviewSchema = createInsertSchema(performanceReviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPerformanceReview = z.infer<typeof insertPerformanceReviewSchema>;
export type PerformanceReview = typeof performanceReviewsTable.$inferSelect;

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
