---
name: Education AI privacy and multilingual exports
description: Education storage boundaries, provider retention honesty, and Bengali PDF font portability.
---

Education source PDFs and extracted text are transient. The owner now requires successful generated results in signed-in account history; keep those results separate from source content and apply the product's 24-hour expiry. Browser flashcard edits/progress are separate from the original account result.

**Why:** The education specification combines saved study results with the site's secure-file promise. Sending extracted text to an AI provider does not mean that provider deletes its own monitoring logs when our application releases its buffers.

**How to apply:** New education tools must disclose provider retention honestly. Do not claim end-to-end deletion or zero retention without verified provider/account settings; stored-completion opt-out alone is insufficient.

Education Zone uses the owner's own OpenRouter credential rather than Replit-billed AI access.

**Why:** The user explicitly chose an OpenRouter API key. The existing production deployment is Railway, so the provider configuration must remain portable.

**How to apply:** Preserve this provider choice when extending education tools. Request credentials securely and keep them server-side; do not provision a different billed integration without the user's decision.

Embed a licensed Bengali font for Bengali printable output rather than relying solely on system font installation.

**Why:** Replit's development fontconfig resolved Bengali requests to DejaVu Sans, even though Railway's build/runtime can install Noto fonts. Host-font assumptions made development and production output inconsistent.

**How to apply:** Test actual Bengali PDF text/rendering and package the font/license with export assets; keep website typography unchanged.

Follow the latest step-scoped Education brief rather than implementing every tool from an earlier overall brief. Expose only working tools during staged delivery.

**Why:** The owner replaced the full rollout request with a three-step rollout and explicitly prohibits placeholder/Coming soon content. Their global instructions say not to run browser tests, screenshots, preview checks or end-to-end tests; they will test manually.

**How to apply:** Finish the tools named in the current step, use code-level checks, and carry the server-only AI, existing-provider and no-placeholder rules into later steps.

Preserve the five-free-generations daily allowance; extra successful signed-in generations spend one existing account credit. Failed AI or failed saving must not spend credits, and retries must not spend twice.

**Why:** This extends the existing free quota with the existing purchased-credit balance rather than replacing billing or adding a second allowance system.

**How to apply:** Keep charging and saving generated results atomic, and distinguish request replay from deliberately asking for a new generation.