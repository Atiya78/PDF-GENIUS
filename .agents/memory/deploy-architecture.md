---
name: Production deploy architecture
description: How pdf-convert is deployed to production (Railway + Supabase + Expo EAS) and the co-hosting decision behind it.
---

# Production deployment

- **api-server → Railway**, **database → Supabase**, **mobile → Expo EAS**.
- Railway runs ONE service that serves BOTH the web frontend and the API on a single origin.

## Web is co-hosted from the api-server
The web app calls the backend with **same-origin** relative paths. Rather than host the web separately and rely on CORS/absolute URLs, the API server co-hosts the compiled frontend. Preserve the public snapshot/private SPA/unknown-route boundaries described in [Web SEO](web-seo-per-route.md), not a blanket homepage fallback.

**Why:** single domain → no CORS config, no absolute API base URL, deep links work. User explicitly chose this option.

**How to apply:**
- `serveWebApp` is a no-op if the web build is absent (so local Replit dev, where web is its own artifact behind the shared proxy, is unaffected). It locates the build via `__dirname` → `../../pdf-convert-master/dist/public`.
- Railway must complete the full web build, including SEO snapshots, before the API starts co-hosting it. Build-time artifact environment variables are not guaranteed; do not reintroduce Vite config failures when they are absent.
- Railway **start**: `pnpm --filter @workspace/api-server start`. Do NOT set `PORT` on Railway (it injects its own at runtime).

## Railway pnpm lockfile
Root `package.json` pins `"packageManager": "pnpm@10.26.1"` so Railpack uses pnpm 10 (matches the lockfile). Without it Railpack reads `lockfileVersion 9.0`, defaults to pnpm 9, normalizes the `overrides` block differently, and fails `--frozen-lockfile` with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. The override content is actually identical across versions — it's purely a pnpm-version representation gap.

## Mobile → backend
`EXPO_PUBLIC_DOMAIN` (host only, no protocol) selects the backend; `constants/api.ts` builds `https://${domain}/api`. `eas.json` sets it per build profile to the Railway host. CORS on the api-server is wide open (`app.use(cors())`), so mobile cross-origin calls work.
