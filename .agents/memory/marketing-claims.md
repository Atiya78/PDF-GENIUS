---
name: Marketing claim verification
description: PDF Genius advertising context and the evidence requirement for public claims.
---

Public copy must not invent usage numbers, testimonials, reliability guarantees or security assurances. Use a TODO when evidence or business confirmation is missing.

**Why:** The creator explicitly states that PDF Genius runs Google Ads and false claims are a risk.

**How to apply:** Check visible copy, metadata and structured data together. Verify processing and retention against reachable tool implementations, distinguishing memory cleanup from persistent-file deletion. Do not treat an advertised support response target as confirmed until the creator confirms it.

Google Play/mobile declarations and website advertising disclosures are separate scopes.

**Why:** The earlier first-party-only analytics baseline was a mobile-store declaration; the creator confirms Google Ads on the website.

**How to apply:** Do not copy the mobile analytics declaration into website notices without auditing the website's tracking and consent setup.

Trace the actual file-submit handler before labeling a web tool browser-only. A browser PDF library or preview does not prove that processing stays local.

**Why:** A browser verification exposed server-backed Split/Rotate PDF workflows that earlier copy had mislabeled as local. Native and web implementations can differ.

**How to apply:** Audit the mounted web component's request path, output format and exposed controls before writing its instructions or processing disclosures. Describe fixed/default behavior honestly rather than documenting options that only exist in the backend.