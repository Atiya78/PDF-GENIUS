/**
 * Single source of truth for business details used across every legal page,
 * the footer and the contact page. Edit here; page text lives in ./*.md.
 *
 * TODO: confirm — registered business address was not provided. While `address`
 * is empty it is simply not shown anywhere on the site.
 */
export const COMPANY = {
  legalName: "FLEXO AI LLC",
  state: "Wyoming",
  country: "USA",
  address: "",
  product: "PDF Genius",
  website: "https://pdfgenius.app",
  domain: "pdfgenius.app",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.pdfgenius.app",
  supportEmail: "support@pdfgenius.app",
  privacyEmail: "privacy@pdfgenius.app",
  effectiveDate: "February 7, 2026",
  lastUpdated: "November 7, 2026",
  refundDays: 14,
  paddleBuyerTerms: "https://www.paddle.com/legal/checkout-buyer-terms",
  // TODO: confirm — Dodo Payments' customer-facing terms URL.
  dodoBuyerTerms: "https://dodopayments.com/legal/terms-of-use",
  // TODO: confirm — advertised support response target.
  supportResponse: "within 2 business days",
} as const;

/** Values substituted for {{key}} tokens in the markdown files. */
export const LEGAL_TOKENS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(COMPANY).map(([k, v]) => [k, String(v)])),
  entity: `${COMPANY.legalName}, a ${COMPANY.state} limited liability company`,
  addressSentence: COMPANY.address ? ` Our registered address is ${COMPANY.address}.` : "",
  year: String(new Date().getFullYear()),
};

/** Every legal/company page, in footer order. */
export const LEGAL_PAGES = [
  { path: "/terms", label: "Terms of Service" },
  { path: "/privacy", label: "Privacy Policy" },
  { path: "/refund-policy", label: "Refund Policy" },
  { path: "/cancellation-policy", label: "Cancellation Policy" },
  { path: "/cookie-policy", label: "Cookie Policy" },
  { path: "/acceptable-use", label: "Acceptable Use" },
  { path: "/ai-policy", label: "AI Usage Policy" },
  { path: "/dmca", label: "Copyright / DMCA" },
  { path: "/disclaimer", label: "Disclaimer" },
  { path: "/delete-account", label: "Delete Account" },
] as const;
