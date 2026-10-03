const reported = new WeakSet<Blob>();

/** One event per saved result Blob; no names, contents, or auth data are sent. */
export function reportSuccessfulDownload(blob: Blob): void {
  if (reported.has(blob) || typeof window === "undefined") return;
  reported.add(blob);
  try {
    const report = (window as Window & {
      gtag_report_conversion?: () => unknown;
    }).gtag_report_conversion;
    if (typeof report === "function") report();
  } catch {
    // Ads scripts may be blocked. Never interrupt a successful download.
  }
}