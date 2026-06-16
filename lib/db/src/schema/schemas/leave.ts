import { pgTable, text, serial, timestamp, integer, boolean, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaveRequestStatusEnum = pgEnum("leave_request_status", ["pending", "approved", "rejected", "cancelled"]);

export const leaveTypesTable = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  defaultDays: integer("default_days").notNull().default(0),
  carryForward: boolean("carry_forward").notNull().default(false),
  isPaid: boolean("is_paid").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const leaveBalancesTable = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  leaveTypeId: integer("leave_type_id").notNull(),
  year: integer("year").notNull(),
  allocated: integer("allocated").notNull().default(0),
  used: integer("used").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const leaveRequestsTable = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  leaveTypeId: integer("leave_type_id").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  isHalfDay: boolean("is_half_day").notNull().default(false),
  totalDays: numeric("total_days", { precision: 4, scale: 1 }).notNull().default("1"),
  reason: text("reason"),
  status: leaveRequestStatusEnum("status").notNull().default("pending"),
  reviewedById: integer("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeaveTypeSchema = createInsertSchema(leaveTypesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;
export type LeaveType = typeof leaveTypesTable.$inferSelect;

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalancesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;
export type LeaveBalance = typeof leaveBalancesTable.$inferSelect;

export const insertLeaveRequestSchema = createInsertSchema(leaveRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequestsTable.$inferSelect;
