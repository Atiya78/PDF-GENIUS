---
name: Education AI privacy and multilingual exports
description: Education storage boundaries, provider retention honesty, and Bengali PDF font portability.
---

Education source PDFs and extracted text are transient. Generated flashcard decks/progress may be saved in the browser. Daily-limit metadata is separate from document content.

**Why:** The education specification combines AI processing with the site's secure-file promise. Sending extracted text to an AI provider does not mean that provider deletes its own monitoring logs when our application releases its buffers.

**How to apply:** New education tools must disclose provider retention honestly. Do not claim end-to-end deletion or zero retention without verified provider/account settings; stored-completion opt-out alone is insufficient.

Education Zone uses the owner's own OpenRouter credential rather than Replit-billed AI access.

**Why:** The user explicitly chose an OpenRouter API key. The existing production deployment is Railway, so the provider configuration must remain portable.

**How to apply:** Preserve this provider choice when extending education tools. Request credentials securely and keep them server-side; do not provision a different billed integration without the user's decision.

Embed a licensed Bengali font for Bengali printable output rather than relying solely on system font installation.

**Why:** Replit's development fontconfig resolved Bengali requests to DejaVu Sans, even though Railway's build/runtime can install Noto fonts. Host-font assumptions made development and production output inconsistent.

**How to apply:** Test actual Bengali PDF text/rendering and package the font/license with export assets; keep website typography unchanged.