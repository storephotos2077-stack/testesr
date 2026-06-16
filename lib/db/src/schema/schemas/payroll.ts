import { pgTable, text, serial, timestamp, integer, numeric, json, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payslipStatusEnum = pgEnum("payslip_status", ["draft", "published"]);

export const payrollStructuresTable = pgTable("payroll_structures", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  basicPay: numeric("basic_pay", { precision: 12, scale: 2 }).notNull(),
  allowances: json("allowances").notNull().default({}),
  deductions: json("deductions").notNull().default({}),
  effectiveDate: date("effective_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const payslipsTable = pgTable("payslips", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  basicPay: numeric("basic_pay", { precision: 12, scale: 2 }).notNull(),
  allowances: json("allowances").notNull().default({}),
  deductions: json("deductions").notNull().default({}),
  grossPay: numeric("gross_pay", { precision: 12, scale: 2 }).notNull(),
  netPay: numeric("net_pay", { precision: 12, scale: 2 }).notNull(),
  status: payslipStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPayrollStructureSchema = createInsertSchema(payrollStructuresTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayrollStructure = z.infer<typeof insertPayrollStructureSchema>;
export type PayrollStructure = typeof payrollStructuresTable.$inferSelect;

export const insertPayslipSchema = createInsertSchema(payslipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayslip = z.infer<typeof insertPayslipSchema>;
export type Payslip = typeof payslipsTable.$inferSelect;
