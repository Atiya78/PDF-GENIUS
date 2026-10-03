# Education Zone

Study tools that turn a lecture PDF or pasted text into practice material.

## Structure
- `src/pages/education/` - `EducationHome` (/education), `QuizGeneratorPage`, `FlashcardsPage`. Lazy routes live in `src/App.tsx`.
- `src/components/education/` - `EducationZoneSection` (homepage, lazy in `Body.tsx`), `EducationToolLayout`, `ToolCard`, `UploadBox`, `QuizWorkspace`/`QuizPlayer`/`QuizEditor`, `FlashcardWorkspace`/`FlashcardDeck`/`FlashcardGrid`, `ExportMenu`, `GenerationProgress`.
- `src/lib/education/` - `educationTools.ts` (the single tool config + FAQs), `useSource`, `exportHelpers` (CSV, Anki, copy, print, server export), `storage` (versioned localStorage for decks only), `useTrack` (count-only analytics), `errors`.

## Add a tool in 3 steps
1. Add one entry to `educationTools` in `lib/education/educationTools.ts` (set `status: "live"`, a `href`, `category`, and `faqs`). The hub, filter tabs and related-tools lists update automatically.
2. Create `src/pages/education/YourToolPage.tsx` using `EducationToolLayout` (upload, options, result slots), add a lazy import and a `<Route>` in `src/App.tsx`.
3. Add the API route, prompt and schema in the API server, add it to the OpenAPI spec, then use the generated hook from `@workspace/api-client-react`. Add the page to SEO/sitemap config.

## Privacy rules
Never put uploaded PDFs or extracted text in localStorage. Only generated decks and progress are saved. Clear temporary source text after generating.

## Backend setup
- Add `OPENAI_API_KEY` through Secrets. Default model: `gpt-5-mini`. Optional `EDUCATION_AI_MODEL` and `EDUCATION_AI_BASE_URL` switch OpenAI-compatible providers; generation prompts and provider calls live in `artifacts/api-server/src/education/ai.ts`.
- `config.ts` controls the 20 MB/50-page/250,000-character limits, chunk size, concurrency and **5 successful generations/day shared across both tools**. The UTC/IP quota is atomic and persistent in the existing Supabase database; failures are refunded. Shared networks share this free limit; paid exemptions are not implemented.
- Only the additive `education_daily_usage` table is created lazily. It stores a keyed IP hash, UTC date and counter. Records older than the previous UTC day are purged on subsequent generation requests. The database role needs permission to create this table on first use. No existing tables or accounts change.
- The education Express sub-app owns its bounded body parser and one trusted proxy hop, without changing existing webhook parsers or authentication. If infrastructure adds proxies, adjust the education sub-app's trusted-hop setting to match.
- PDF input and extracted text remain in memory only. Tesseract OCR uses English + Bengali locally. AI receives extracted text; provider retention is separate from our no-storage policy. `store:false` disables stored completions, not provider abuse-monitoring logs.
- Quiz PDF, separate answer-key PDF, DOCX and 2×4 flashcard PDF use `/api/education/export`. A bundled OFL-licensed Noto Sans Bengali font makes Bengali PDF output independent of host fonts; overlong printable cards fail with an edit-first message, never silently lose text.
- Analytics are first-party structured activity logs only (`/api/education/events`), never document content.

## Checks
`pnpm --filter @workspace/api-server test:education` runs PDF/OCR, limits, quota/refund, export and strict-JSON/chunk regression tests. AI regression tests use an isolated local provider fixture; they do not verify live provider credentials or factual accuracy. Run the web typecheck/build for generated SEO snapshots and sitemap.

Full created/changed file list: [EDUCATION-CHANGES.md](../../EDUCATION-CHANGES.md).
