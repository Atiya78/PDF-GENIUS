# PDF Genius

This pnpm monorepo contains the web application, API server and Expo mobile app.

## Replicate image tools

The API server uses Replicate's official Node.js SDK for Aura SR v2 upscaling
and background removal. Aura produces WebP output at 4×; the existing 2× option
resizes that AI-generated result. Results use the application's authenticated
download flow and 24-hour storage retention rather than temporary provider URLs.

For Railway, set **`REPLICATE_API_TOKEN` in Railway → Service → Variables**.
Use an active Replicate API token; never commit or log it. Replit Secrets and
attached Replit integrations do not automatically configure Railway variables.
Missing tokens produce an explicit startup warning, and unconfigured AI tools
return a readable error without preventing other tools from starting.

The SDK is a runtime dependency of `@workspace/api-server` only. Its package
manifest and the root `pnpm-lock.yaml` must be included in the same Git commit.

```sh
pnpm install --frozen-lockfile
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/pdf-convert-master build
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

Railway supplies `PORT` at runtime. These commands match `railpack.json`, which
builds the web app and API, then starts the API's `dist/index.mjs`. The API serves
both on one origin. The external SDK remains installed in `node_modules` at runtime.

On Replit only, the SDK transport can use an attached Replicate integration when
the direct token is missing or explicitly rejected with HTTP 401. It does not
retry prediction creation through another credential after timeouts or server errors.

## Education Zone — foundation, quizzes and flashcards

AI runs only in the API server through the existing provider helper. For Railway,
configure the owner's **`OPENROUTER_API_KEY`** as a secret service variable,
**`EDUCATION_AI_PROVIDER=openrouter`**, and optionally
**`EDUCATION_AI_MODEL=openai/gpt-5-mini`**. Keep the existing **`JWT_SECRET`**
and **`SUPABASE_DB_URL`** configured. No new environment-variable names or
dependencies are required. Replit Secrets do not configure Railway.

Uploads are transient, capped at 20 MB, 500 selected pages and 250,000 source
characters. Scans must go through `/upload/ocr-pdf` first. Each request includes
a UUID for duplicate-safe retry; external callers should send a fresh
`requestId` only when deliberately asking for a new generation.

Five successful generations per UTC day are free, shared across both tools.
Additional signed-in generations cost one existing account credit, deducted
only after validated AI output. Credit spending and saving the result share a
database transaction. Errors release free-quota reservations.

The additive `education_generation_requests` table is created lazily using the
existing Supabase pool; the database role must allow table/index creation.
Only generated material is saved, never PDFs, source text or prompts. Account
history expires after 24 hours, with a one-minute cleanup sweep. Guests have only
a bounded ten-minute in-memory result replay cache. Local flashcard progress
and edits remain browser-scoped, separate from the original account result.

The build copies the licensed Noto Sans Bengali font into API output assets.
Quiz exports include question-paper PDF, answer-key PDF, DOCX, TXT, Markdown and
CSV. Card exports include paired A4 front/back sheets with mirrored backs and
cut lines, DOCX, Markdown and two-field UTF-8 Anki CSV/TXT. Print uses the same
self-contained, font-embedded server export HTML.

Code-only verification, with no browser or live AI/provider calls:
`pnpm --filter @workspace/api-server test:education-foundation`.
