import { pgTable, text, serial, timestamp, integer, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "wfh", "half_day", "late"]);

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  status: attendanceStatusEnum("status").notNull().default("present"),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
