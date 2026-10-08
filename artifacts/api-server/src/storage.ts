import crypto from "crypto";
import { 
  users, 
  apiKeys,
  conversionJobs,
  notifications,
  passwordResetCodes,
  signupVerifications,
  creditGrants,
  type User, 
  type CreditGrant,
  type InsertUser,
  type ApiKey,
  type InsertApiKey,
  type ConversionJob,
  type InsertConversionJob,
  type Notification,
  type InsertNotification,
  type PasswordResetCode,
  type SignupVerification,
  type ToolConfig,
  toolSettings,
  ToolType,
  ToolCategory
} from "@workspace/db";
import { db } from "@workspace/db";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { hashApiKey } from "./utils/generateApiKey";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, updates: { name?: string; email?: string }): Promise<User | undefined>;
  updateUserProfilePicture(id: string, profilePictureUrl: string): Promise<User | undefined>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  updateUserPlan(id: string, plan: string): Promise<User | undefined>;
  // Dodo Payments references, set by the billing webhook on subscription events.
  updateUserDodoRefs(
    id: string,
    refs: { dodoCustomerId?: string | null; dodoSubscriptionId?: string | null },
  ): Promise<User | undefined>;
  getUserByDodoCustomerId(customerId: string): Promise<User | undefined>;

  // Credit methods. grantCreditsForPurchase is idempotent on purchaseId: it
  // returns the granted CreditGrant the first time a purchase is seen, and
  // undefined on every subsequent call for the same purchase.
  grantCreditsForPurchase(
    userId: string,
    purchaseId: string,
    productId: string,
    credits: number,
  ): Promise<CreditGrant | undefined>;

  // Password reset methods
  createPasswordResetCode(userId: string, codeHash: string, expiresAt: Date): Promise<void>;
  getLatestActiveResetCode(userId: string): Promise<PasswordResetCode | undefined>;
  consumeResetCode(id: string): Promise<void>;
  incrementResetAttempts(id: string): Promise<number>;

  // Signup OTP verification methods (pending registrations)
  upsertSignupVerification(email: string, name: string | null, passwordHash: string, codeHash: string, expiresAt: Date): Promise<void>;
  getSignupVerification(email: string): Promise<SignupVerification | undefined>;
  incrementSignupAttempts(id: string): Promise<number>;
  deleteSignupVerification(email: string): Promise<void>;
  
  // API Key methods
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>; // accepts the RAW key; hashes internally
  getApiKeyById(id: string): Promise<ApiKey | undefined>;
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
  deleteApiKey(id: string): Promise<boolean>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  
  // Conversion job methods
  createConversionJob(job: InsertConversionJob): Promise<ConversionJob>;
  getConversionJob(id: number): Promise<ConversionJob | undefined>;
  getUserConversionJobs(userId: string): Promise<ConversionJob[]>;
  updateConversionJobStatus(id: number, status: string, outputFilename?: string, errorMessage?: string, processingTime?: number, outputFileSize?: number): Promise<ConversionJob | undefined>;
  deleteConversionJob(id: number): Promise<void>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  hasNotificationType(userId: string, type: string): Promise<boolean>;
  markNotificationRead(id: string, userId: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<void>;
  
  // Tool configuration methods
  getAllTools(): Promise<ToolConfig[]>;
  getToolByType(type: ToolType): Promise<ToolConfig | undefined>;
  getToolsByCategory(category: ToolCategory): Promise<ToolConfig[]>;

  // Admin tool pause controls. Paused tools reject new conversions everywhere.
  getPausedToolTypes(): Promise<Set<string>>;
  isToolPaused(toolType: string): Promise<boolean>;
  setToolPaused(toolType: string, paused: boolean): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private apiKeys: Map<string, ApiKey>;
  private conversionJobs: Map<number, ConversionJob>;
  private resetCodes: Map<string, PasswordResetCode>;
  private signupVerifications: Map<string, SignupVerification>;
  private notifications: Map<string, Notification>;
  private tools: ToolConfig[] = [];
  private currentJobId: number;

  constructor() {
    this.users = new Map();
    this.apiKeys = new Map();
    this.conversionJobs = new Map();
    this.resetCodes = new Map();
    this.signupVerifications = new Map();
    this.notifications = new Map();
    this.currentJobId = 1;
    this.initializeTools();
  }

  private initializeTools() {
    this.tools = [
      // PDF Conversion Tools (1-7)
      {
        id: 1,
        name: "PDF to Word",
        type: ToolType.PDF_TO_WORD,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert PDF documents to editable Word format",
        inputFormats: ["pdf"],
        outputFormat: "docx",
        maxFileSize: 50,
        processingTimeEstimate: 30
      },
      {
        id: 2,
        name: "PDF to Excel",
        type: ToolType.PDF_TO_EXCEL,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert PDF documents to Excel spreadsheets",
        inputFormats: ["pdf"],
        outputFormat: "xlsx",
        maxFileSize: 50,
        processingTimeEstimate: 45
      },
      {
        id: 3,
        name: "PDF to PowerPoint",
        type: ToolType.PDF_TO_POWERPOINT,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert PDF documents to PowerPoint presentations",
        inputFormats: ["pdf"],
        outputFormat: "pptx",
        maxFileSize: 50,
        processingTimeEstimate: 60
      },
      {
        id: 4,
        name: "Word to PDF",
        type: ToolType.WORD_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert Word documents to PDF format",
        inputFormats: ["doc", "docx"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 20
      },
      {
        id: 5,
        name: "Excel to PDF",
        type: ToolType.EXCEL_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert Excel spreadsheets to PDF format",
        inputFormats: ["xls", "xlsx"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 25
      },
      {
        id: 28, name: "CSV to PDF", type: ToolType.CSV_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert CSV data to a paginated PDF table",
        inputFormats: ["csv"], outputFormat: "pdf", maxFileSize: 5,
        processingTimeEstimate: 10
      },
      {
        id: 6,
        name: "PowerPoint to PDF",
        type: ToolType.POWERPOINT_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert PowerPoint presentations to PDF format",
        inputFormats: ["ppt", "pptx"],
        outputFormat: "pdf",
        maxFileSize: 200,
        processingTimeEstimate: 30
      },
      {
        id: 7,
        name: "HTML to PDF",
        type: ToolType.HTML_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert HTML pages to PDF documents",
        inputFormats: ["html", "htm"],
        outputFormat: "pdf",
        maxFileSize: 10,
        processingTimeEstimate: 15
      },
      
      // Image Tools (8-16)
      {
        id: 8,
        name: "Images to PDF",
        type: ToolType.IMAGES_TO_PDF,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Combine multiple images into a single PDF document",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp", "tiff"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 20
      },
      {
        id: 9,
        name: "PDF to Images",
        type: ToolType.PDF_TO_IMAGES,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Extract images from PDF documents",
        inputFormats: ["pdf"],
        outputFormat: "zip",
        maxFileSize: 100,
        processingTimeEstimate: 40
      },
      {
        id: 10,
        name: "Compress Image",
        type: ToolType.COMPRESS_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Reduce image file size while maintaining quality",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
        outputFormat: "same",
        maxFileSize: 50,
        processingTimeEstimate: 10
      },
      {
        id: 11,
        name: "Convert Image Format",
        type: ToolType.CONVERT_IMAGE_FORMAT,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Convert images between different formats",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"],
        outputFormat: "various",
        maxFileSize: 50,
        processingTimeEstimate: 15
      },
      {
        id: 12,
        name: "Crop Image",
        type: ToolType.CROP_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Crop images to specific dimensions or ratios",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
        outputFormat: "same",
        maxFileSize: 50,
        processingTimeEstimate: 5
      },
      {
        id: 13,
        name: "Resize Image",
        type: ToolType.RESIZE_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Resize images to specific dimensions",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
        outputFormat: "same",
        maxFileSize: 50,
        processingTimeEstimate: 8
      },
      {
        id: 14,
        name: "Rotate Image",
        type: ToolType.ROTATE_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Rotate images by specified angles",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
        outputFormat: "same",
        maxFileSize: 50,
        processingTimeEstimate: 5
      },
      {
        id: 15,
        name: "Upscale Image",
        type: ToolType.UPSCALE_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Enhance image resolution using AI upscaling",
        inputFormats: ["jpg", "jpeg", "png", "webp"],
        outputFormat: "same",
        maxFileSize: 25,
        processingTimeEstimate: 120
      },
      {
        id: 16,
        name: "Remove Background",
        type: ToolType.REMOVE_BACKGROUND,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Remove background from images automatically",
        inputFormats: ["jpg", "jpeg", "png"],
        outputFormat: "png",
        maxFileSize: 25,
        processingTimeEstimate: 30
      },
      
      // PDF Management Tools (17-20)
      {
        id: 17,
        name: "Merge PDFs",
        type: ToolType.MERGE_PDFS,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Combine multiple PDF files into one document",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 200,
        processingTimeEstimate: 25
      },
      {
        id: 18,
        name: "Split PDF",
        type: ToolType.SPLIT_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Split PDF documents into separate pages or ranges",
        inputFormats: ["pdf"],
        outputFormat: "zip",
        maxFileSize: 100,
        processingTimeEstimate: 20
      },
      {
        id: 19,
        name: "Compress PDF",
        type: ToolType.COMPRESS_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Reduce PDF file size while maintaining quality",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 200,
        processingTimeEstimate: 35
      },
      {
        id: 25,
        name: "Video Compressor",
        type: ToolType.COMPRESS_VIDEO,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Reduce video file size while keeping good quality",
        inputFormats: ["mp4", "mov", "mkv", "avi", "webm", "flv", "wmv", "m4v", "mpeg", "mpg", "3gp", "ts", "m2ts", "mts", "ogv"],
        outputFormat: "mp4",
        maxFileSize: 200,
        processingTimeEstimate: 60
      },
      {
        id: 20,
        name: "Rotate PDF",
        type: ToolType.ROTATE_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Rotate PDF pages by specified angles",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 15
      },
      {
        id: 21,
        name: "OCR PDF",
        type: ToolType.OCR_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Recognise text in scanned PDFs and export a searchable PDF",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 60
      },
      {
        id: 22,
        name: "Document Restore",
        type: ToolType.RESTORE_DOCUMENT,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Restore a broken or damaged PDF/image (deskew, de-fade, denoise, sharpen) into a clean PDF",
        inputFormats: ["pdf", "jpg", "jpeg", "png", "webp", "bmp", "tiff"],
        outputFormat: "pdf",
        maxFileSize: 25,
        processingTimeEstimate: 30
      },
      {
        id: 23,
        name: "Lock PDF",
        type: ToolType.LOCK_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Password-protect a PDF with strong AES-256 encryption",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 15
      },
      {
        id: 24,
        name: "Unlock PDF",
        type: ToolType.UNLOCK_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Remove password protection from a PDF you can open",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 15
      }
    ];
  }

  // User methods
  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date();
    const user: User = { 
      id,
      email: insertUser.email!,
      name: insertUser.name ?? null,
      passwordHash: insertUser.passwordHash!,
      plan: insertUser.plan || "free",
      credits: 0,
      dodoCustomerId: null,
      dodoSubscriptionId: null,
      profilePictureUrl: null,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // In-memory idempotent credit grant: keyed by purchaseId so re-syncing the
  // same purchase never double-credits.
  private creditGrants: Map<string, CreditGrant> = new Map();

  async grantCreditsForPurchase(
    userId: string,
    purchaseId: string,
    productId: string,
    credits: number,
  ): Promise<CreditGrant | undefined> {
    if (this.creditGrants.has(purchaseId)) return undefined;
    const user = this.users.get(userId);
    if (!user) return undefined;
    const grant: CreditGrant = {
      id: crypto.randomUUID(),
      userId,
      purchaseId,
      productId,
      credits,
      createdAt: new Date(),
    };
    this.creditGrants.set(purchaseId, grant);
    this.users.set(userId, { ...user, credits: (user.credits ?? 0) + credits });
    return grant;
  }

  async updateUserProfile(
    id: string,
    updates: { name?: string; email?: string },
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const next: User = {
      ...user,
      name: updates.name !== undefined ? updates.name : user.name,
      email: updates.email !== undefined ? updates.email : user.email,
    };
    this.users.set(id, next);
    return next;
  }

  async updateUserProfilePicture(
    id: string,
    profilePictureUrl: string,
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const next: User = { ...user, profilePictureUrl };
    this.users.set(id, next);
    return next;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) return;
    this.users.set(id, { ...user, passwordHash });
  }

  async updateUserPlan(id: string, plan: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const next: User = { ...user, plan };
    this.users.set(id, next);
    return next;
  }

  async updateUserDodoRefs(
    id: string,
    refs: { dodoCustomerId?: string | null; dodoSubscriptionId?: string | null },
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const next: User = {
      ...user,
      ...(refs.dodoCustomerId !== undefined
        ? { dodoCustomerId: refs.dodoCustomerId }
        : {}),
      ...(refs.dodoSubscriptionId !== undefined
        ? { dodoSubscriptionId: refs.dodoSubscriptionId }
        : {}),
    };
    this.users.set(id, next);
    return next;
  }

  async getUserByDodoCustomerId(customerId: string): Promise<User | undefined> {
    for (const u of this.users.values()) {
      if ((u as any).dodoCustomerId === customerId) return u;
    }
    return undefined;
  }

  // Password reset methods
  async createPasswordResetCode(
    userId: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    // Invalidate any previous codes for this user so only the newest works.
    for (const [key, code] of this.resetCodes) {
      if (code.userId === userId) this.resetCodes.delete(key);
    }
    const id = crypto.randomUUID();
    this.resetCodes.set(id, {
      id,
      userId,
      codeHash,
      expiresAt,
      consumedAt: null,
      createdAt: new Date(),
      attempts: 0,
    });
  }

  async getLatestActiveResetCode(
    userId: string,
  ): Promise<PasswordResetCode | undefined> {
    const now = Date.now();
    return Array.from(this.resetCodes.values())
      .filter(
        (c) =>
          c.userId === userId &&
          !c.consumedAt &&
          c.expiresAt.getTime() > now,
      )
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0];
  }

  async consumeResetCode(id: string): Promise<void> {
    const code = this.resetCodes.get(id);
    if (code) this.resetCodes.set(id, { ...code, consumedAt: new Date() });
  }

  async incrementResetAttempts(id: string): Promise<number> {
    const code = this.resetCodes.get(id);
    if (!code) return 0;
    const attempts = (code.attempts ?? 0) + 1;
    this.resetCodes.set(id, { ...code, attempts });
    return attempts;
  }

  // Signup OTP verification methods (keyed by lowercased email so re-requests
  // replace the prior pending code).
  async upsertSignupVerification(
    email: string,
    name: string | null,
    passwordHash: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const key = email.toLowerCase();
    this.signupVerifications.set(key, {
      id: crypto.randomUUID(),
      email: key,
      name,
      passwordHash,
      codeHash,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });
  }

  async getSignupVerification(email: string): Promise<SignupVerification | undefined> {
    return this.signupVerifications.get(email.toLowerCase());
  }

  async incrementSignupAttempts(id: string): Promise<number> {
    for (const [key, v] of this.signupVerifications) {
      if (v.id === id) {
        const attempts = (v.attempts ?? 0) + 1;
        this.signupVerifications.set(key, { ...v, attempts });
        return attempts;
      }
    }
    return 0;
  }

  async deleteSignupVerification(email: string): Promise<void> {
    this.signupVerifications.delete(email.toLowerCase());
  }

  // API Key methods
  // NOTE: insertApiKey.apiKey is expected to already be the sha256 HASH of the
  // raw key (hashing is done by the caller in routes.ts). The Map is keyed by id.
  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const id = crypto.randomUUID();
    const now = new Date();
    const apiKey: ApiKey = {
      id,
      userId: insertApiKey.userId,
      apiKey: insertApiKey.apiKey,
      name: insertApiKey.name ?? null,
      keyLast4: insertApiKey.keyLast4 ?? null,
      lastUsedAt: null,
      createdAt: now
    };
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const hash = hashApiKey(key);
    return Array.from(this.apiKeys.values()).find((k) => k.apiKey === hash);
  }

  async getApiKeyById(id: string): Promise<ApiKey | undefined> {
    return this.apiKeys.get(id);
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter(
      (apiKey) => apiKey.userId === userId,
    );
  }

  async deleteApiKey(id: string): Promise<boolean> {
    return this.apiKeys.delete(id);
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    const existing = this.apiKeys.get(id);
    if (existing) {
      existing.lastUsedAt = new Date();
      this.apiKeys.set(id, existing);
    }
  }

  // Conversion job methods
  async createConversionJob(insertJob: InsertConversionJob): Promise<ConversionJob> {
    const id = this.currentJobId++;
    const now = new Date();
    const job: ConversionJob = { 
      id,
      userId: insertJob.userId || null,
      toolType: insertJob.toolType,
      status: insertJob.status || "pending",
      source: insertJob.source || "web",
      inputFilename: insertJob.inputFilename,
      outputFilename: insertJob.outputFilename || null,
      inputFileSize: insertJob.inputFileSize || null,
      outputFileSize: insertJob.outputFileSize || null,
      processingTime: insertJob.processingTime || null,
      errorMessage: insertJob.errorMessage || null,
      createdAt: now,
      updatedAt: now
    };
    this.conversionJobs.set(id, job);
    return job;
  }

  async getConversionJob(id: number): Promise<ConversionJob | undefined> {
    return this.conversionJobs.get(id);
  }

  async getUserConversionJobs(userId: string): Promise<ConversionJob[]> {
    return Array.from(this.conversionJobs.values()).filter(
      (job) => job.userId === userId,
    );
  }

  async updateConversionJobStatus(
    id: number, 
    status: string, 
    outputFilename?: string, 
    errorMessage?: string,
    processingTime?: number,
    outputFileSize?: number
  ): Promise<ConversionJob | undefined> {
    const job = this.conversionJobs.get(id);
    if (!job) return undefined;

    const updatedJob: ConversionJob = {
      ...job,
      status,
      outputFilename: outputFilename || job.outputFilename,
      errorMessage: errorMessage || job.errorMessage,
      processingTime: processingTime || job.processingTime,
      outputFileSize: outputFileSize ?? job.outputFileSize,
      updatedAt: new Date()
    };

    this.conversionJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteConversionJob(id: number): Promise<void> {
    this.conversionJobs.delete(id);
  }

  // Notification methods
  async createNotification(insert: InsertNotification): Promise<Notification> {
    const id = crypto.randomUUID();
    const notification: Notification = {
      id,
      userId: insert.userId,
      type: insert.type ?? "info",
      title: insert.title,
      body: insert.body ?? null,
      link: insert.link ?? null,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getUserNotifications(userId: string, limit = 30): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt as any).getTime() -
          new Date(a.createdAt as any).getTime(),
      )
      .slice(0, limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId && !n.read,
    ).length;
  }

  async hasNotificationType(userId: string, type: string): Promise<boolean> {
    return Array.from(this.notifications.values()).some(
      (n) => n.userId === userId && n.type === type,
    );
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const n = this.notifications.get(id);
    if (!n || n.userId !== userId) return false;
    this.notifications.set(id, { ...n, read: true });
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    for (const [key, n] of this.notifications) {
      if (n.userId === userId && !n.read) {
        this.notifications.set(key, { ...n, read: true });
      }
    }
  }

  // Tool configuration methods
  async getAllTools(): Promise<ToolConfig[]> {
    return [...this.tools];
  }

  async getToolByType(type: ToolType): Promise<ToolConfig | undefined> {
    return this.tools.find(tool => tool.type === type);
  }

  async getToolsByCategory(category: ToolCategory): Promise<ToolConfig[]> {
    return this.tools.filter(tool => tool.category === category);
  }

  // Admin tool pause controls (in-memory)
  private pausedTools: Set<string> = new Set();

  async getPausedToolTypes(): Promise<Set<string>> {
    return new Set(this.pausedTools);
  }

  async isToolPaused(toolType: string): Promise<boolean> {
    return this.pausedTools.has(toolType);
  }

  async setToolPaused(toolType: string, paused: boolean): Promise<void> {
    if (paused) this.pausedTools.add(toolType);
    else this.pausedTools.delete(toolType);
  }
}

export class DatabaseStorage implements IStorage {
  private tools: ToolConfig[] = [];

  constructor() {
    this.initializeTools();
  }

  private initializeTools() {
    this.tools = [
      // PDF Conversion Tools (1-7)
      {
        id: 1,
        name: "PDF to Word",
        type: ToolType.PDF_TO_WORD,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert PDF documents to editable Word format",
        inputFormats: ["pdf"],
        outputFormat: "docx",
        maxFileSize: 50,
        processingTimeEstimate: 30
      },
      {
        id: 2,
        name: "PDF to Excel",
        type: ToolType.PDF_TO_EXCEL,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert PDF documents to Excel spreadsheets",
        inputFormats: ["pdf"],
        outputFormat: "xlsx",
        maxFileSize: 50,
        processingTimeEstimate: 45
      },
      {
        id: 3,
        name: "PDF to PowerPoint",
        type: ToolType.PDF_TO_POWERPOINT,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert PDF documents to PowerPoint presentations",
        inputFormats: ["pdf"],
        outputFormat: "pptx",
        maxFileSize: 50,
        processingTimeEstimate: 60
      },
      {
        id: 4,
        name: "Word to PDF",
        type: ToolType.WORD_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert Word documents to PDF format",
        inputFormats: ["doc", "docx"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 20
      },
      {
        id: 5,
        name: "Excel to PDF",
        type: ToolType.EXCEL_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert Excel spreadsheets to PDF format",
        inputFormats: ["xls", "xlsx"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 25
      },
      {
        id: 28, name: "CSV to PDF", type: ToolType.CSV_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert CSV data to a paginated PDF table",
        inputFormats: ["csv"], outputFormat: "pdf", maxFileSize: 5,
        processingTimeEstimate: 10
      },
      {
        id: 6,
        name: "PowerPoint to PDF",
        type: ToolType.POWERPOINT_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert PowerPoint presentations to PDF format",
        inputFormats: ["ppt", "pptx"],
        outputFormat: "pdf",
        maxFileSize: 200,
        processingTimeEstimate: 30
      },
      {
        id: 7,
        name: "HTML to PDF",
        type: ToolType.HTML_TO_PDF,
        category: ToolCategory.PDF_CONVERSION,
        description: "Convert HTML pages to PDF documents",
        inputFormats: ["html", "htm"],
        outputFormat: "pdf",
        maxFileSize: 10,
        processingTimeEstimate: 15
      },
      
      // Image Tools (8-16)
      {
        id: 8,
        name: "Images to PDF",
        type: ToolType.IMAGES_TO_PDF,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Combine multiple images into a single PDF document",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp", "tiff"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 20
      },
      {
        id: 9,
        name: "PDF to Images",
        type: ToolType.PDF_TO_IMAGES,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Extract images from PDF documents",
        inputFormats: ["pdf"],
        outputFormat: "zip",
        maxFileSize: 100,
        processingTimeEstimate: 40
      },
      {
        id: 10,
        name: "Compress Image",
        type: ToolType.COMPRESS_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Reduce image file size while maintaining quality",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
        outputFormat: "same",
        maxFileSize: 50,
        processingTimeEstimate: 10
      },
      {
        id: 11,
        name: "Convert Image Format",
        type: ToolType.CONVERT_IMAGE_FORMAT,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Convert images between different formats",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"],
        outputFormat: "various",
        maxFileSize: 50,
        processingTimeEstimate: 15
      },
      {
        id: 12,
        name: "Crop Image",
        type: ToolType.CROP_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Crop images to specific dimensions or ratios",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
        outputFormat: "same",
        maxFileSize: 50,
        processingTimeEstimate: 5
      },
      {
        id: 13,
        name: "Resize Image",
        type: ToolType.RESIZE_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Resize images to specific dimensions",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
        outputFormat: "same",
        maxFileSize: 50,
        processingTimeEstimate: 8
      },
      {
        id: 14,
        name: "Rotate Image",
        type: ToolType.ROTATE_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Rotate images by specified angles",
        inputFormats: ["jpg", "jpeg", "png", "gif", "bmp"],
        outputFormat: "same",
        maxFileSize: 50,
        processingTimeEstimate: 5
      },
      {
        id: 15,
        name: "Upscale Image",
        type: ToolType.UPSCALE_IMAGE,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Enhance image resolution using AI upscaling",
        inputFormats: ["jpg", "jpeg", "png", "webp"],
        outputFormat: "same",
        maxFileSize: 25,
        processingTimeEstimate: 120
      },
      {
        id: 16,
        name: "Remove Background",
        type: ToolType.REMOVE_BACKGROUND,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Remove background from images automatically",
        inputFormats: ["jpg", "jpeg", "png"],
        outputFormat: "png",
        maxFileSize: 25,
        processingTimeEstimate: 30
      },
      
      // PDF Management Tools (17-20)
      {
        id: 17,
        name: "Merge PDFs",
        type: ToolType.MERGE_PDFS,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Combine multiple PDF files into one document",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 200,
        processingTimeEstimate: 25
      },
      {
        id: 18,
        name: "Split PDF",
        type: ToolType.SPLIT_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Split PDF documents into separate pages or ranges",
        inputFormats: ["pdf"],
        outputFormat: "zip",
        maxFileSize: 100,
        processingTimeEstimate: 20
      },
      {
        id: 19,
        name: "Compress PDF",
        type: ToolType.COMPRESS_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Reduce PDF file size while maintaining quality",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 200,
        processingTimeEstimate: 35
      },
      {
        id: 25,
        name: "Video Compressor",
        type: ToolType.COMPRESS_VIDEO,
        category: ToolCategory.IMAGE_TOOLS,
        description: "Reduce video file size while keeping good quality",
        inputFormats: ["mp4", "mov", "mkv", "avi", "webm", "flv", "wmv", "m4v", "mpeg", "mpg", "3gp", "ts", "m2ts", "mts", "ogv"],
        outputFormat: "mp4",
        maxFileSize: 200,
        processingTimeEstimate: 60
      },
      {
        id: 20,
        name: "Rotate PDF",
        type: ToolType.ROTATE_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Rotate PDF pages by specified angles",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 15
      },
      {
        id: 21,
        name: "OCR PDF",
        type: ToolType.OCR_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Recognise text in scanned PDFs and export a searchable PDF",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 60
      },
      {
        id: 22,
        name: "Document Restore",
        type: ToolType.RESTORE_DOCUMENT,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Restore a broken or damaged PDF/image (deskew, de-fade, denoise, sharpen) into a clean PDF",
        inputFormats: ["pdf", "jpg", "jpeg", "png", "webp", "bmp", "tiff"],
        outputFormat: "pdf",
        maxFileSize: 25,
        processingTimeEstimate: 30
      },
      {
        id: 23,
        name: "Lock PDF",
        type: ToolType.LOCK_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Password-protect a PDF with strong AES-256 encryption",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 15
      },
      {
        id: 24,
        name: "Unlock PDF",
        type: ToolType.UNLOCK_PDF,
        category: ToolCategory.PDF_MANAGEMENT,
        description: "Remove password protection from a PDF you can open",
        inputFormats: ["pdf"],
        outputFormat: "pdf",
        maxFileSize: 100,
        processingTimeEstimate: 15
      }
    ];
  }

  // User methods
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserProfile(
    id: string,
    updates: { name?: string; email?: string },
  ): Promise<User | undefined> {
    const set: Partial<typeof users.$inferInsert> = {};
    if (updates.name !== undefined) set.name = updates.name;
    if (updates.email !== undefined) set.email = updates.email;
    const [user] = await db.update(users).set(set).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserProfilePicture(
    id: string,
    profilePictureUrl: string,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ profilePictureUrl })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async updateUserPlan(id: string, plan: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ plan })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserDodoRefs(
    id: string,
    refs: { dodoCustomerId?: string | null; dodoSubscriptionId?: string | null },
  ): Promise<User | undefined> {
    const set: Record<string, string | null> = {};
    if (refs.dodoCustomerId !== undefined) set.dodoCustomerId = refs.dodoCustomerId;
    if (refs.dodoSubscriptionId !== undefined)
      set.dodoSubscriptionId = refs.dodoSubscriptionId;
    if (Object.keys(set).length === 0) return this.getUserById(id);
    const [user] = await db
      .update(users)
      .set(set)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUserByDodoCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.dodoCustomerId, customerId))
      .limit(1);
    return user || undefined;
  }

  // Idempotently credit a one-time purchase. The unique purchaseId constraint is
  // the idempotency key: we insert the ledger row with onConflictDoNothing, and
  // only bump the user's balance when a NEW row was actually written. The whole
  // thing runs in a transaction so the ledger row and the balance can't diverge.
  async grantCreditsForPurchase(
    userId: string,
    purchaseId: string,
    productId: string,
    credits: number,
  ): Promise<CreditGrant | undefined> {
    return await db.transaction(async (tx) => {
      const [grant] = await tx
        .insert(creditGrants)
        .values({ userId, purchaseId, productId, credits })
        .onConflictDoNothing({ target: creditGrants.purchaseId })
        .returning();

      // Already granted on a previous sync — nothing to do.
      if (!grant) return undefined;

      await tx
        .update(users)
        .set({ credits: sql`${users.credits} + ${credits}` })
        .where(eq(users.id, userId));

      return grant;
    });
  }

  // Password reset methods
  async createPasswordResetCode(
    userId: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    // Invalidate any previous codes for this user so only the newest works.
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.userId, userId));
    await db.insert(passwordResetCodes).values({ userId, codeHash, expiresAt });
  }

  async getLatestActiveResetCode(
    userId: string,
  ): Promise<PasswordResetCode | undefined> {
    const [code] = await db
      .select()
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.userId, userId),
          isNull(passwordResetCodes.consumedAt),
          gt(passwordResetCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(passwordResetCodes.createdAt))
      .limit(1);
    return code || undefined;
  }

  async consumeResetCode(id: string): Promise<void> {
    await db
      .update(passwordResetCodes)
      .set({ consumedAt: new Date() })
      .where(eq(passwordResetCodes.id, id));
  }

  // Atomically bump the failed-attempt counter and return the new total so the
  // caller can invalidate the code once the brute-force limit is reached.
  async incrementResetAttempts(id: string): Promise<number> {
    const [row] = await db
      .update(passwordResetCodes)
      .set({ attempts: sql`${passwordResetCodes.attempts} + 1` })
      .where(eq(passwordResetCodes.id, id))
      .returning({ attempts: passwordResetCodes.attempts });
    return row?.attempts ?? 0;
  }

  // Signup OTP verification methods. The email column is unique, so a re-request
  // upserts (replaces the pending code) rather than stacking rows.
  async upsertSignupVerification(
    email: string,
    name: string | null,
    passwordHash: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const key = email.toLowerCase();
    await db
      .insert(signupVerifications)
      .values({ email: key, name, passwordHash, codeHash, expiresAt, attempts: 0 })
      .onConflictDoUpdate({
        target: signupVerifications.email,
        set: { name, passwordHash, codeHash, expiresAt, attempts: 0, createdAt: new Date() },
      });
  }

  async getSignupVerification(email: string): Promise<SignupVerification | undefined> {
    const [row] = await db
      .select()
      .from(signupVerifications)
      .where(eq(signupVerifications.email, email.toLowerCase()))
      .limit(1);
    return row || undefined;
  }

  async incrementSignupAttempts(id: string): Promise<number> {
    const [row] = await db
      .update(signupVerifications)
      .set({ attempts: sql`${signupVerifications.attempts} + 1` })
      .where(eq(signupVerifications.id, id))
      .returning({ attempts: signupVerifications.attempts });
    return row?.attempts ?? 0;
  }

  async deleteSignupVerification(email: string): Promise<void> {
    await db.delete(signupVerifications).where(eq(signupVerifications.email, email.toLowerCase()));
  }

  // API Key methods
  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db
      .insert(apiKeys)
      .values(insertApiKey)
      .returning();
    return apiKey;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.apiKey, hashApiKey(key)));
    return apiKey || undefined;
  }

  async getApiKeyById(id: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey || undefined;
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const deleted = await db.delete(apiKeys).where(eq(apiKeys.id, id)).returning();
    return deleted.length > 0;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  // Conversion job methods
  async createConversionJob(insertJob: InsertConversionJob): Promise<ConversionJob> {
    const [job] = await db
      .insert(conversionJobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async getConversionJob(id: number): Promise<ConversionJob | undefined> {
    const [job] = await db.select().from(conversionJobs).where(eq(conversionJobs.id, id));
    return job || undefined;
  }

  async getUserConversionJobs(userId: string): Promise<ConversionJob[]> {
    return await db.select().from(conversionJobs).where(eq(conversionJobs.userId, userId));
  }

  async updateConversionJobStatus(
    id: number, 
    status: string, 
    outputFilename?: string, 
    errorMessage?: string,
    processingTime?: number,
    outputFileSize?: number
  ): Promise<ConversionJob | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (outputFilename !== undefined) updateData.outputFilename = outputFilename;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (processingTime !== undefined) updateData.processingTime = processingTime;
    if (outputFileSize !== undefined) updateData.outputFileSize = outputFileSize;

    const [job] = await db
      .update(conversionJobs)
      .set(updateData)
      .where(eq(conversionJobs.id, id))
      .returning();
    
    return job || undefined;
  }

  async deleteConversionJob(id: number): Promise<void> {
    await db.delete(conversionJobs).where(eq(conversionJobs.id, id));
  }

  // Notification methods
  async createNotification(insert: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insert)
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string, limit = 30): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return row?.count ?? 0;
  }

  async hasNotificationType(userId: string, type: string): Promise<boolean> {
    const [row] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, type)))
      .limit(1);
    return !!row;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const updated = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated.length > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  // Tool configuration methods
  async getAllTools(): Promise<ToolConfig[]> {
    return [...this.tools];
  }

  async getToolByType(type: ToolType): Promise<ToolConfig | undefined> {
    return this.tools.find(tool => tool.type === type);
  }

  async getToolsByCategory(category: ToolCategory): Promise<ToolConfig[]> {
    return this.tools.filter(tool => tool.category === category);
  }

  // Admin tool pause controls (DB-backed, cached briefly so the hot conversion
  // path doesn't hit the database on every request).
  private pausedCache: { set: Set<string>; fetchedAt: number } | null = null;
  private static PAUSE_CACHE_MS = 5_000;
  private toolSettingsReady: Promise<void> | null = null;

  // Startup bootstrap: environments deployed before this feature (e.g. prod)
  // won't have the table yet, and the deploy flow has no migration runner.
  // Idempotent and cached so it runs at most once per process.
  private ensureToolSettingsTable(): Promise<void> {
    if (!this.toolSettingsReady) {
      this.toolSettingsReady = db
        .execute(sql`
          CREATE TABLE IF NOT EXISTS tool_settings (
            tool_type text PRIMARY KEY,
            paused boolean NOT NULL DEFAULT false,
            updated_at timestamp DEFAULT now()
          )
        `)
        .then(() => undefined)
        .catch((err: unknown) => {
          // Allow a retry on the next call rather than caching the failure.
          this.toolSettingsReady = null;
          throw err;
        });
    }
    return this.toolSettingsReady;
  }

  async getPausedToolTypes(): Promise<Set<string>> {
    const now = Date.now();
    if (this.pausedCache && now - this.pausedCache.fetchedAt < DatabaseStorage.PAUSE_CACHE_MS) {
      return this.pausedCache.set;
    }
    try {
      await this.ensureToolSettingsTable();
      const rows = await db
        .select({ toolType: toolSettings.toolType })
        .from(toolSettings)
        .where(eq(toolSettings.paused, true));
      const set = new Set(rows.map((r) => r.toolType));
      this.pausedCache = { set, fetchedAt: now };
      return set;
    } catch (err) {
      // Fail open: a pause-state read failure must never take down the
      // conversion endpoints. Treat all tools as active until the DB recovers.
      console.error("[tool-pause] Failed to read pause state, treating all tools as active:", err);
      return this.pausedCache?.set ?? new Set();
    }
  }

  async isToolPaused(toolType: string): Promise<boolean> {
    return (await this.getPausedToolTypes()).has(toolType);
  }

  async setToolPaused(toolType: string, paused: boolean): Promise<void> {
    await this.ensureToolSettingsTable();
    await db
      .insert(toolSettings)
      .values({ toolType, paused, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: toolSettings.toolType,
        set: { paused, updatedAt: new Date() },
      });
    // Bust the cache so the change takes effect immediately in this process.
    this.pausedCache = null;
  }
}

export const storage = new DatabaseStorage();
export const memStorage = new MemStorage();
