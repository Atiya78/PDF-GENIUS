import { date, integer, pgTable, primaryKey, text, uuid, timestamp, jsonb, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";

// Privacy-safe daily quota metadata only; source PDFs/text are never stored.
export const educationDailyUsage = pgTable("education_daily_usage", {
  identityHash: text("identity_hash").notNull(),
  usageDate: date("usage_date").notNull(),
  used: integer("used").notNull().default(0),
}, table => [
  primaryKey({ name: "education_daily_usage_pkey", columns: [table.identityHash, table.usageDate] }),
]);

// Only successful generated material is saved; never source PDFs or prompts.
export const educationGenerationRequests = pgTable("education_generation_requests", {
  id: uuid("id").notNull().unique(),
  identityHash: text("identity_hash").notNull(),
  requestKey: uuid("request_key").notNull(),
  requestHash: text("request_hash").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  result: jsonb("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ name: "education_generation_requests_pkey", columns: [table.identityHash, table.requestKey] }),
  index("education_results_user_created").on(table.userId, table.createdAt.desc()),
  check("education_generation_requests_kind_check", sql`${table.kind} IN ('quiz','flashcards','chat','notes')`),
  check("education_generation_requests_status_check", sql`${table.status} IN ('processing','succeeded')`),
]);