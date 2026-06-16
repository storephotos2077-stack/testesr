import { pgTable, text, serial, timestamp, integer, numeric, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employmentStatusEnum = pgEnum("employment_status", ["active", "inactive", "on_leave", "terminated"]);
export const employmentTypeEnum = pgEnum("employment_type", ["full_time", "part_time", "contract", "intern"]);

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  employeeCode: text("employee_code").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  gender: text("gender"),
  address: text("address"),
  departmentId: integer("department_id"),
  designationId: integer("designation_id"),
  managerId: integer("manager_id"),
  status: employmentStatusEnum("status").notNull().default("active"),
  employmentType: employmentTypeEnum("employment_type").notNull().default("full_time"),
  hireDate: date("hire_date", { mode: "string" }).notNull(),
  salary: numeric("salary", { precision: 12, scale: 2 }),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
