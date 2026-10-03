---
name: Data Safety + Privacy alignment
description: Google Play Data Safety declared baseline for PDF Genius and the privacy-policy facts that must match it.
---

# Google Play Data Safety — declared baseline (PDF Genius)

The official import CSV uses Google's 5-column schema (`Question ID`, `Response ID`, `Response value`, `Answer requirement`, `Human-friendly question label`). Every data type has a full `PSL_DATA_USAGE_RESPONSES:<TYPE>:<SUBQ>` usage block; only set `Response value=true` on selected options, leave others blank. Stored deliverable: `store-assets/PDF-Genius-Data-Safety.csv`. Never hand-roll a different CSV layout — Google rejects it.

**Declared (collected, never shared; encrypted in transit; deletion via /contact):**
- Name (opt), Email (opt), User IDs (opt) — App functionality + Account management (Email also Developer communications)
- Purchase history (opt) — App functionality + Account management
- Files and docs (req) — App functionality
- Photos (opt) — App functionality (camera document scanner)
- App interactions (req) — App functionality + Analytics
- Device or other IDs (req) — Fraud prevention/security + Analytics

**NOT collected:** location, payment info (app store handles it), crash logs, diagnostics, health, messages, audio, contacts, calendar, web browsing, installed apps, in-app search.

**Why "Analytics" purpose but no third-party SDKs:** analytics is FIRST-PARTY only (api-server usage stats). There are NO third-party analytics/crash/ads SDKs. Privacy policy must say analytics + cookies are first-party and must NOT claim third-party analytics services or third-party tracking cookies, or it contradicts the Data Safety form (Play review risk).

**Payments wording:** in-app billing via Google Play / Apple App Store (they process card data); RevenueCat is a data *processor* (not "sharing"). Data Safety "not shared" + privacy policy processor mentions must be phrased so they don't read as contradictory.

**How to apply:** when editing privacy policy / data safety / store listing, keep all three (CSV, `PrivacyPolicy.tsx`, `DataSafety.tsx` at route `/data-safety`) in lockstep with the table above.
