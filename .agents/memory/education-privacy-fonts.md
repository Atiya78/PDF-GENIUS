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

Browserless Vite builds omit the production SEO manifest; development must keep the API running independently of that compiled frontend.

**Why:** A standalone bundle check empties the web output directory without running browser-based prerendering. Treating that development bundle as a complete production snapshot crashed API startup.

**How to apply:** Use the development Vite server and API-only mode for missing development snapshots. Keep missing production manifests a deployment error; do not manufacture placeholder SEO snapshots.

Preserve the five-free-generations daily allowance; extra successful signed-in generations spend one existing account credit. Failed AI or failed saving must not spend credits, and retries must not spend twice.

**Why:** This extends the existing free quota with the existing purchased-credit balance rather than replacing billing or adding a second allowance system.

**How to apply:** Keep charging and saving generated results atomic, and distinguish request replay from deliberately asking for a new generation.

Unsupported Study Q&A answers do not consume credits or the free allowance; PDF-grounded starter questions are also uncharged.

**Why:** An explicit abstention is honest but does not deliver a supported study answer. Treating it as a billable success would conflict with success-only charging.

**How to apply:** Preserve the same request replay and history behavior for abstentions, while charging only supported completed answers.

Generated account history may contain source quotations and formulas, but must not become a store of uploaded PDFs or full extracted source text. Chat sessions and editable notes are page-local; history stores the generated answer or original generated notes.

**Why:** Page citations require evidence quotes and history must retain generated results. Privacy copy must distinguish these generated excerpts from original source storage.

**How to apply:** Describe quoted citations in the 24-hour account-history disclosure; require the original PDF again to inspect a saved answer's cited page, and warn before replacing unsaved note edits.

Treat one fully completed PDF translation as one study generation, not a separate paid generation for each page. Partial translations do not spend the free allowance or account credits.

**Why:** The shared success-only pricing applies to the user's finished document. Charging page retries would penalize provider failures and make long documents unexpectedly expensive.

**How to apply:** Preserve completed-page resumability and whole-document duplicate protection without storing the uploaded PDF or extracted source. Generated translation history can contain the entire translated document; privacy wording must distinguish that output from original-source storage.

The final Education rollout includes all eight tools. The four category chips have an exact six-tool mapping; Summarizer and Mind Map remain discoverable under All and in navigation/search.

**Why:** The final brief explicitly requires finishing every remaining card while separately defining the chip membership. Removing the two extra tools would violate that completion scope.

**How to apply:** Keep Practice = Quiz + Exam, Revision = Flashcards + Ask PDF, Notes = Notes Maker, Translate = Translator; do not restore staged or Coming soon cards.