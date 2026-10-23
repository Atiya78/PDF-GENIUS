import { z } from "zod";

export const authEmailSchema = z.string().trim().email("Please enter a valid email address");

export const signupInputSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer").optional(),
});

export const signupVerificationSchema = z.object({
  email: authEmailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

/** Older deployed APIs return the useful validation messages in `details`. */
export function authErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as { details?: unknown; error?: unknown };
  if (Array.isArray(data.details)) {
    const messages = data.details
      .filter((issue): issue is { message: string; path: string[] } =>
        !!issue && typeof issue === "object" &&
        typeof issue.message === "string" &&
        Array.isArray(issue.path) &&
        ["email", "password", "name", "code"].includes(issue.path[0]),
      )
      .map(issue => issue.message);
    if (messages.length) return [...new Set(messages)].slice(0, 3).join(". ");
  }
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error === "Validation failed" ? "Please check your details and try again." : data.error;
  }
  return fallback;
}
