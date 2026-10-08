import { pgTable, text, serial, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Users table with authentication system
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  plan: text("plan").notNull().default("free"),
  // Consumable credit balance. Topped up by one-time credit-pack purchases
  // (see creditGrants) and spent by metered operations.
  credits: integer("credits").notNull().default(0),
  // Dodo Payments references for web subscriptions. Set by the billing webhook
  // when a subscription activates; used to open the customer portal and to map
  // subscription lifecycle events back to this user.
  dodoCustomerId: text("dodo_customer_id"),
  dodoSubscriptionId: text("dodo_subscription_id"),
  profilePictureUrl: text("profile_picture_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ledger of consumable credit-pack purchases. Each row records that a specific
// store purchase has already been credited to a user. The purchaseId is unique
// so the same RevenueCat purchase can never be granted twice (idempotent sync).
export const creditGrants = pgTable("credit_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  // RevenueCat purchase id (purchase.id) — the idempotency key.
  purchaseId: text("purchase_id").notNull().unique(),
  // The store/product identifier of the credit pack that was purchased.
  productId: text("product_id").notNull(),
  // Number of credits granted by this purchase.
  credits: integer("credits").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CreditGrant = typeof creditGrants.$inferSelect;

// Password reset codes. A short numeric code is emailed to the user; only its
// hash is stored here. Codes are single-use (consumedAt) and time-limited.
export const passwordResetCodes = pgTable("password_reset_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  // Failed verification attempts. The code is invalidated once this hits the
  // limit, so a 6-digit code can't be brute-forced within its TTL.
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetCode = typeof passwordResetCodes.$inferSelect;

// Pending signup verifications. When a user signs up we do NOT create their
// account immediately — we stash the pending registration here (with the
// password already hashed) and email them a 6-digit code. The real user row is
// only created once they verify the code. Only the code's hash is stored, and
// codes are time-limited + attempt-limited to resist brute force.
export const signupVerifications = pgTable("signup_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SignupVerification = typeof signupVerifications.$inferSelect;

// API Keys table
// NOTE: `apiKey` stores a sha256 HASH of the raw key, never the plaintext.
// The raw `sk-...` key is shown to the user exactly once at creation time.
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  apiKey: text("api_key").unique().notNull(),
  name: text("name"),
  keyLast4: text("key_last4"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});


// Notifications table. Per-user, in-app notifications generated from real
// account events (welcome on signup, API key created, etc.). `read` flips when
// the user opens / acknowledges the notification.
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  // info | success | security | welcome — drives the icon/accent in the UI.
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  // Optional in-app destination (e.g. "/dashboard/api-setup").
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  body: true,
  link: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// User schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email format")
}).pick({
  email: true,
  name: true,
  passwordHash: true,
  plan: true,
});

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().trim().min(1, "Name is required").max(120).optional(),
});

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Profile / account management schemas
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120).optional(),
    email: z.string().email("Invalid email format").optional(),
  })
  .refine((d) => d.name !== undefined || d.email !== undefined, {
    message: "Nothing to update",
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  code: z.string().trim().min(4, "Enter the code from your email").max(12),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// Verify a signup OTP. The pending registration (name/password) is already
// stored server-side, so the client only needs to echo back the email + code.
export const verifySignupOtpSchema = z.object({
  email: z.string().email("Invalid email format"),
  // The emailed OTP is always exactly 6 digits.
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type VerifySignupOtp = z.infer<typeof verifySignupOtpSchema>;

// API Key schemas
export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  userId: true,
  apiKey: true,
  name: true,
  keyLast4: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Tool categories and types
export enum ToolCategory {
  PDF_CONVERSION = "pdf_conversion",
  IMAGE_TOOLS = "image_tools", 
  PDF_MANAGEMENT = "pdf_management"
}

export enum ToolType {
  // PDF Conversion Tools
  PDF_TO_WORD = "pdf_to_word",
  PDF_TO_EXCEL = "pdf_to_excel",
  PDF_TO_POWERPOINT = "pdf_to_powerpoint",
  WORD_TO_PDF = "word_to_pdf",
  EXCEL_TO_PDF = "excel_to_pdf",
  CSV_TO_PDF = "csv_to_pdf",
  POWERPOINT_TO_PDF = "powerpoint_to_pdf",
  HTML_TO_PDF = "html_to_pdf",
  
  // Image Tools
  IMAGES_TO_PDF = "images_to_pdf",
  PDF_TO_IMAGES = "pdf_to_images",
  COMPRESS_IMAGE = "compress_image",
  CONVERT_IMAGE_FORMAT = "convert_image_format",
  CROP_IMAGE = "crop_image",
  RESIZE_IMAGE = "resize_image",
  ROTATE_IMAGE = "rotate_image",
  UPSCALE_IMAGE = "upscale_image",
  REMOVE_BACKGROUND = "remove_background",
  
  // PDF Management Tools
  MERGE_PDFS = "merge_pdfs",
  SPLIT_PDF = "split_pdf",
  COMPRESS_PDF = "compress_pdf",
  ROTATE_PDF = "rotate_pdf",
  OCR_PDF = "ocr_pdf",
  RESTORE_DOCUMENT = "restore_document",
  LOCK_PDF = "lock_pdf",
  UNLOCK_PDF = "unlock_pdf",

  // Video Tools
  COMPRESS_VIDEO = "compress_video"
}

// Per-tool admin settings. A row exists only once an admin has touched a tool;
// absence of a row means the tool runs normally. `paused` tools reject new
// conversions everywhere (web, mobile, public API) with a friendly 503.
export const toolSettings = pgTable("tool_settings", {
  toolType: text("tool_type").primaryKey(),
  paused: boolean("paused").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ToolSetting = typeof toolSettings.$inferSelect;

// Conversion jobs table  
export const conversionJobs = pgTable("conversion_jobs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  toolType: text("tool_type").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  source: text("source").notNull().default("web"), // web (in-app) or api (public REST API)
  inputFilename: text("input_filename").notNull(),
  outputFilename: text("output_filename"),
  inputFileSize: integer("input_file_size"),
  outputFileSize: integer("output_file_size"),
  processingTime: integer("processing_time"), // in milliseconds
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConversionJobSchema = createInsertSchema(conversionJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversionJob = z.infer<typeof insertConversionJobSchema>;
export type ConversionJob = typeof conversionJobs.$inferSelect;

// Tool configuration
export interface ToolConfig {
  id: number;
  name: string;
  type: ToolType;
  category: ToolCategory;
  description: string;
  inputFormats: string[];
  outputFormat: string;
  maxFileSize: number; // in MB
  processingTimeEstimate: number; // in seconds
}

// File conversion request/response schemas
export const fileConversionRequestSchema = z.object({
  toolType: z.nativeEnum(ToolType),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  options: z.record(z.string(), z.any()).optional(), // Additional conversion options
});

export const fileConversionResponseSchema = z.object({
  jobId: z.number(),
  status: z.string(),
  message: z.string(),
  downloadUrl: z.string().optional(),
  processingTime: z.number().optional(),
});

export type FileConversionRequest = z.infer<typeof fileConversionRequestSchema>;
export type FileConversionResponse = z.infer<typeof fileConversionResponseSchema>;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  conversionJobs: many(conversionJobs),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const conversionJobsRelations = relations(conversionJobs, ({ one }) => ({
  user: one(users, {
    fields: [conversionJobs.userId],
    references: [users.id],
  }),
}));
