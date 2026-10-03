/**
 * Transactional email delivery via Resend (Replit integration).
 *
 * Replit's connector SDK forwards requests and manages credentials when the
 * Resend connection is attached. A direct RESEND_API_KEY remains supported
 * for deployments outside Replit.
 *
 * If Resend is not connected, `sendPasswordResetEmail` throws; callers should
 * treat that as a soft failure (log it, but do not leak account existence to
 * the client).
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

/**
 * Absolute, publicly-reachable URL of the brand logo for email headers.
 *
 * Email clients cannot load relative paths, so we build an absolute URL from
 * the runtime domain. `PUBLIC_APP_URL` lets you override with a custom domain;
 * otherwise we use the first `REPLIT_DOMAINS` entry (the dev domain in
 * development, the deployed domain in production). The logo file itself is
 * served by the web app at `/genius-logo.png`.
 */
function getLogoUrl(): string {
  const override = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  const base =
    override ||
    (process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
      : "");
  return `${base}/genius-logo.png`;
}

/**
 * Default "from" address. Resend only delivers mail sent from a VERIFIED domain;
 * our verified domain is pdfgenius.app, so we send as noreply@pdfgenius.app.
 */
const DEFAULT_FROM = "PDF Genius <noreply@pdfgenius.app>";

/**
 * Pick a safe sender. The Resend connector lets the user type any "from" address,
 * but anything not on our verified pdfgenius.app domain is rejected by Resend
 * (HTTP 403). So we only honour a connector-configured sender when it's on
 * pdfgenius.app; otherwise we fall back to the verified no-reply address.
 */
function resolveFromAddress(configured?: string): string {
  const value = configured?.trim();
  if (value && /@pdfgenius\.app>?$/i.test(value)) {
    return value;
  }
  return DEFAULT_FROM;
}

/** Keep direct-key hosting support, without retrieving connector secrets. */
async function sendResendEmail(payload: Record<string, unknown>): Promise<Response> {
  const envKey = process.env.RESEND_API_KEY?.trim();
  const request = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  };
  if (envKey) {
    return fetch("https://api.resend.com/emails", {
      ...request,
      headers: { ...request.headers, Authorization: `Bearer ${envKey}` },
    });
  }
  const proxyFetch = new ReplitConnectors().createProxyFetch("resend");
  return proxyFetch("https://api.resend.com/emails", request);
}

/** Sends a 6-digit password reset code to the user's email via Resend. */
export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const fromAddress = resolveFromAddress(process.env.RESEND_FROM);

  const res = await sendResendEmail({
      from: fromAddress,
      to: [to],
      subject: "Your PDF Genius password reset code",
      html: passwordResetHtml(code),
      text:
        `Your PDF Genius password reset code is ${code}. ` +
        `It expires in 15 minutes. If you didn't request this, you can ignore this email.`,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body }, "Resend email send failed");
    throw new Error(`Resend send failed (${res.status})`);
  }
}

/** Sends a 6-digit signup verification code to a prospective user via Resend. */
export async function sendSignupOtpEmail(to: string, code: string): Promise<void> {
  const fromAddress = resolveFromAddress(process.env.RESEND_FROM);

  const res = await sendResendEmail({
      from: fromAddress,
      to: [to],
      subject: "Your PDF Genius verification code",
      html: signupOtpHtml(code),
      text:
        `Your PDF Genius verification code is ${code}. ` +
        `It expires in 10 minutes. If you didn't try to sign up, you can ignore this email.`,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body }, "Resend signup OTP send failed");
    throw new Error(`Resend send failed (${res.status})`);
  }
}

/**
 * Shared, polished, email-client-safe OTP email template. Table-based 600px
 * layout with a max-width fallback for mobile, inline CSS only (most clients
 * strip <style> blocks), logo + app-name header, a prominent OTP box, and the
 * PDF Genius coral brand accent (#f7433d).
 *
 * Both the signup verification email and the password reset email render from
 * this single builder so their designs never drift apart.
 */
interface OtpEmailOptions {
  /** Big heading under the logo, e.g. "Password Reset Request". */
  heading: string;
  /** Friendly intro paragraph explaining what the code is for. */
  intro: string;
  /** Small uppercase label above the code, e.g. "Your reset code". */
  codeLabel: string;
  /** The 6-digit one-time code. */
  code: string;
  /** Human expiry duration shown in bold, e.g. "15 minutes". */
  expiry: string;
  /** Reassurance line shown at the bottom of the body. */
  footnote: string;
}

function otpEmailHtml(opts: OtpEmailOptions): string {
  return `
  <div style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
            <!-- Header: brand logo only -->
            <tr>
              <td align="center" style="padding:32px 24px 16px 24px;">
                <img src="${getLogoUrl()}" alt="PDF Genius" width="190" style="display:block;border:0;outline:none;text-decoration:none;width:190px;max-width:190px;height:auto;margin:0 auto;" />
              </td>
            </tr>
            <!-- Heading -->
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;color:#1f2937;text-align:center;font-weight:700;">${opts.heading}</h1>
              </td>
            </tr>
            <!-- Greeting -->
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#4b5563;text-align:center;">
                  ${opts.intro}
                </p>
              </td>
            </tr>
            <!-- OTP box -->
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <div style="background-color:#fff1f0;border:1px solid #ffd9d6;border-radius:12px;padding:24px;text-align:center;">
                  <div style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;margin-bottom:8px;">${opts.codeLabel}</div>
                  <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#f7433d;">${opts.code}</div>
                </div>
              </td>
            </tr>
            <!-- Expiry -->
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;text-align:center;">
                  This code expires in <strong style="color:#1f2937;">${opts.expiry}</strong>.
                </p>
              </td>
            </tr>
            <!-- Security note -->
            <tr>
              <td style="padding:16px 32px 24px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;text-align:center;">
                  ${opts.footnote}
                </p>
              </td>
            </tr>
            <!-- Divider -->
            <tr><td style="padding:0 32px;"><div style="border-top:1px solid #eaeaea;"></div></td></tr>
            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px 32px 32px;text-align:center;">
                <div style="font-size:13px;font-weight:600;color:#4b5563;">PDF Genius</div>
                <div style="font-size:13px;color:#9ca3af;margin-top:6px;">
                  Need help? <a href="mailto:support@pdfgenius.app" style="color:#f7433d;text-decoration:none;">support@pdfgenius.app</a>
                </div>
                <div style="font-size:12px;color:#c4c4c4;margin-top:10px;">© 2026 PDF Genius. All rights reserved.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

/** Signup email verification template — shares the polished OTP design. */
function signupOtpHtml(code: string): string {
  return otpEmailHtml({
    heading: "Verify your email",
    intro:
      "Welcome to PDF Genius! Use the one-time code below to finish creating your account.",
    codeLabel: "Your verification code",
    code,
    expiry: "10 minutes",
    footnote:
      "If you didn't try to sign up for PDF Genius, you can safely ignore this email.",
  });
}

/** Password reset template — shares the polished OTP design. */
function passwordResetHtml(otpCode: string): string {
  return otpEmailHtml({
    heading: "Password Reset Request",
    intro:
      "We received a request to reset your PDF Genius password. Use the one-time code below to continue. For your security, it's only valid for a short time.",
    codeLabel: "Your reset code",
    code: otpCode,
    expiry: "15 minutes",
    footnote:
      "If you didn't request this, you can safely ignore this email — your password will remain unchanged.",
  });
}
