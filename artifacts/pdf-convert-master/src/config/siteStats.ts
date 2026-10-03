/**
 * Single source of truth for marketing stats and unverifiable claims.
 * A stat is rendered ONLY when `verified` is true. Every figure imported from
 * the original template is unverified, so all are false.
 * Use `visibleStats` to render.
 */
export interface SiteStat {
  id: string;
  value: string;
  label: string;
  verified: boolean;
}

export const siteStats: SiteStat[] = [
  { id: "active-users", value: "10M+", label: "Active Users", verified: false },
  { id: "files-processed", value: "100M+", label: "Files Processed", verified: false },
  { id: "uptime", value: "99.9%", label: "Uptime", verified: false },
  { id: "support-hours", value: "24/7", label: "Support", verified: false },
  { id: "countries", value: "150+", label: "Countries Served", verified: false },
  { id: "satisfaction", value: "98.3%", label: "Customer satisfaction", verified: false },
  { id: "resolution", value: "99.2%", label: "Issues resolved", verified: false },
  { id: "support-response", value: "< 2h", label: "Average response time", verified: false },
  { id: "success-rate", value: "99.95%", label: "Conversion success rate", verified: false },
  { id: "api-latency", value: "245ms", label: "API response time", verified: false },
  { id: "tutorial-count", value: "15+", label: "Help articles / tutorials", verified: false },
  { id: "money-back", value: "30-day", label: "Money-back guarantee (see Refund Policy)", verified: false },
  { id: "dashboard-users", value: "15,432", label: "Active users", verified: false },
];

export const visibleStats = siteStats.filter((s) => s.verified);
export const getStat = (id: string): SiteStat | undefined =>
  siteStats.find((s) => s.id === id && s.verified);

// TODO(owner): Define DURABLE file retention. Today backend RAM job buffers expire
// after 30 minutes of inactivity (swept every 5 min), but outputs live in durable S3
// and are NOT removed by that sweep. Until a real retention/cleanup policy exists, do
// NOT publish "files are deleted after X minutes/hours". Users can delete saved results.
export const FILE_RETENTION_POLICY: string | null = null;

// TODO(owner): Confirm a real support reply time before promising "reply within 24 hours".
export const SUPPORT_RESPONSE_TIME: string | null = null;

/** Tools that read the file locally (pdf-lib/pdfjs) and do not upload it. */
export const LOCAL_PDF_TOOLS = ["Edit PDF", "Sign PDF", "Crop PDF", "Delete Pages"];
