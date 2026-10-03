---
name: Per-route SEO (web SPA)
description: Why PDF Genius uses build-time public-page snapshots instead of an SSR migration, and the limits of code-only SEO.
---

# Per-route SEO in pdf-convert-master

Keep the working React SPA and its tools; public pages also need complete HTML before JavaScript runs. Use build-time snapshots rather than replacing the app with an SSR framework.

**Why:** The creator reported that crawlers saw only a spinner and required safe SEO changes without rewriting the app or breaking existing tools. Puppeteer was already needed by document conversion.

**How to apply:** Rebuild public snapshots when public content or route metadata changes. Keep private/account content out of snapshots. A new public route needs matching canonical navigation, server handling and sitemap inclusion; an unknown route must remain a real 404, not a homepage fallback.

Keep canonical tool anchors in the rendered homepage and footer when simplifying their presentation; a mobile disclosure may collapse visually but must not remove the links from the HTML.

**Why:** The SEO requirements explicitly include every tool linked from the homepage and a PDF Tools footer directory. A shorter visual footer must preserve that coverage.

**How to apply:** Reorganize or collapse the directory instead of replacing it with only a few popular tools. Verify links remain in pre-rendered HTML as well as the interactive layout.

- `src/lib/useSeo.ts` is a dependency-free hook (uses wouter `useLocation`) that, on
  each route, updates `document.title`, meta description, canonical link, OG/Twitter
  tags, robots directive, and optional JSON-LD. It creates head tags if missing and
  updates them in place otherwise (so no duplicate tags vs `index.html` baseline).
- Brand suffix " | PDF Genius" is auto-appended unless the title already contains the
  brand. `SITE_URL = https://pdfgenius.app`; canonicals always resolve to that origin.
- Canonical tool landings own their metadata and structured data; embedded tool headers must not compete with the landing's heading or metadata. Standalone tools still manage their own metadata.
- Private/account routes (SignIn, SignUp, ForgotPassword, ResetPassword, Dashboard,
  Profile) pass `noindex: true` → `robots: noindex,nofollow`.

**Why:** Per-route client metadata alone did not fix the empty HTML returned to crawlers.

**How to apply:** any new public page should call `useSeo({title, description,
canonicalPath})`; any new private page should add `noindex: true`. Code SEO alone
will NOT make the site index instantly — the owner must verify the domain in Google
Search Console and submit `https://pdfgenius.app/sitemap.xml`, then wait for crawl.
