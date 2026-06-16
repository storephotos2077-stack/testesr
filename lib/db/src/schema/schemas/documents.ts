import { pgTable, text, serial, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentTypeEnum = pgEnum("document_type", ["contract", "id_proof", "certificate", "policy", "other"]);

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id"),
  name: text("name").notNull(),
  type: documentTypeEnum("type").notNull().default("other"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  uploadedById: integer("uploaded_by_id").notNull(),
  isCompanyPolicy: boolean("is_company_policy").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
