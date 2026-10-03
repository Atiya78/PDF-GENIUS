# PDF Genius

PDF conversion and editing tools, with a React web app, an Expo mobile app, and a shared Express API.

## Run & Operate

- Use the managed `artifacts/pdf-convert-master: web` workflow for the web preview at `/` (port 21027).
- Use `artifacts/api-server: API Server` for the API at `/api` (port 8080).
- Use `artifacts/pdf-convert-mobile: expo` for the Expo Go and mobile web previews (port 24364).
- The managed workflows supply `PORT` and routing configuration. Do not add a second web workflow for the same app.
- `pnpm install --frozen-lockfile` — install the entire imported workspace.
- `pnpm --filter @workspace/pdf-convert-master run build` — build the web app.
- `pnpm --filter @workspace/api-server run build` — build the API server.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `SUPABASE_DB_URL` — Supabase Postgres connection string (the app prefers this; falls back to `DATABASE_URL` if unset)
- Verify the API with `GET /api/health`. A healthy response alone does not verify the original Supabase database or external services.

## Environment configuration

GitHub imports do not carry private credentials. Enter secrets using Replit Secrets, never committed files.

- Core secrets: `SUPABASE_DB_URL`, `JWT_SECRET` (at least 16 characters; use a long random value), `GOOGLE_CLIENT_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- Core non-secret settings: `GOOGLE_CLIENT_ID`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `PUBLIC_APP_URL`.
- Email: connect Resend (the SDK manages credentials), or configure `RESEND_API_KEY` for external hosting; `RESEND_FROM` specifies the verified-domain sender.
- Optional admin access: `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
- Optional AI tools: Replicate connection or `REPLICATE_API_TOKEN`; background removal needs `REMOVE_BG_API_KEY`.
- Existing web billing: `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT`, and the `DODO_PRODUCT_*` product IDs.
- Existing mobile billing: connect RevenueCat (or set `REVENUECAT_API_KEY` for external hosting); preserve `REVENUECAT_PROJECT_ID`, the `REVENUECAT_*_APP_ID` values, and `EXPO_PUBLIC_REVENUECAT_*_API_KEY` public SDK keys. Check read-only access with `pnpm --filter @workspace/scripts exec tsx src/checkRevenueCat.ts`.
- The mobile development command points `EXPO_PUBLIC_DOMAIN` to this Replit's API automatically. Native release builds need the intended published API domain.
- `PUBLIC_APP_URL` is scoped separately for development and production. Google OAuth must also authorize the relevant origins and callback URLs in Google Cloud.
- `SESSION_SECRET` does not replace the application's required `JWT_SECRET`. Do not publish using the development-only JWT fallback.
- `PORT`, `BASE_PATH`, and Replit's identity/domain variables are supplied by the managed runtime; do not copy them into shared secrets.
- Optional executable overrides (`PUPPETEER_EXECUTABLE_PATH`, `FFMPEG_PATH`, `FFPROBE_PATH`) are unnecessary when the bundled/runtime binaries are available.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: Supabase PostgreSQL + Drizzle ORM (connection resolved from `SUPABASE_DB_URL`, else `DATABASE_URL`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: Vite (web), esbuild (API ESM bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Branding is CORAL `#f7433d` across both web and mobile artifacts. This is an explicit, user-required choice — never revert to blue (`#2563eb`), even if a review or validation step suggests it.
- The mobile app (`artifacts/pdf-convert-mobile`) must keep real, working features at parity with the web app — no placeholder/"coming soon" screens.
- Keep the `USE_MOCK_DATA` switch and the `services/api.ts` abstraction as the data layer (mock data behind the switch is acceptable).

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
