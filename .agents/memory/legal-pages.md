---
name: Legal pages & consent
description: How legal/company pages, cookie consent, terms acceptance and account deletion are wired; what must stay in sync.
---
- Business facts live in ONE place (web `content/legal/company.ts`); page text is markdown with `{{tokens}}`. Uncertain facts are `TODO: confirm` comments only — never visitor-visible.
  **Why:** Paddle/Dodo verification + owner asked for one editable source and no placeholders.
- Google Ads gtag.js must load ONLY after consent (index.html keeps a denied-by-default stub). GPC = reject. Prerender/automation (navigator.webdriver) skips the banner so snapshots stay clean.
- Terms acceptance is optional server-side (old mobile builds don't send it); web signup requires the checkbox.
- Account deletion is BLOCKED while a paid Dodo or Paddle subscription is active (no auto-cancel; Dodo cancel API untested).
- Old /terms-of-service and /privacy-policy redirect to /terms and /privacy (Play listing links) — keep both the App route and prerender redirect.
- Operator is FLEXO AI LTD (UK, England & Wales, co. no. 17403383, London E6 2JA registered office; owner supplied Companies House certificate Nov 7 2026 — supersedes the earlier "Wyoming LLC" answer). Governing law England & Wales. Never publish the Companies House auth code or HMRC codes from the uploaded letters. Dodo = PDF Tools MoR, Paddle = Education MoR; 14-day refund window; effective date Feb 7, 2026.
