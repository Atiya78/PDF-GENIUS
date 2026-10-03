import { date, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

// Privacy-safe daily quota metadata only; source PDFs/text are never stored.
export const educationDailyUsage = pgTable("education_daily_usage", {
  identityHash: text("identity_hash").notNull(),
  usageDate: date("usage_date").notNull(),
  used: integer("used").notNull().default(0),
}, table => [
  primaryKey({ name: "education_daily_usage_pkey", columns: [table.identityHash, table.usageDate] }),
]);