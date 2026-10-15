---
name: Global color rebrand (PDF Convert Master)
description: How to swap a brand color everywhere across both the web (Tailwind) and Expo apps without missing hidden surfaces.
---

To change a brand color everywhere, a per-file find/replace is NOT enough — color leaks through several channels:

1. **Tailwind palette override (web).** The web app uses hundreds of `*-blue-*` utility classes. Override the `blue` color name in `tailwind.config.ts` to the new ramp; this recolors all utilities at once instead of editing 70+ files. (The literal class names stay `blue-*` but render the new color.)
2. **CSS variables (web).** `src/index.css` HSL tokens (`--primary`, `--ring`, `--accent`, `--accent-foreground`, dark-mode variants) and any button-hover `hsl(...)` must be set separately — they don't go through Tailwind.
3. **Raw `rgb()`/`rgba()` literals.** Decorative components (`animated-background.tsx`, `animated-particles.tsx`, `PdfEditor.tsx`) and a few `index.css` gradients hardcode blue as `rgba(37,99,235,...)`, `rgb(96 165 250 / ...)`, etc. A hex-only sweep misses these — sweep both comma and space-separated rgb forms.
4. **Lottie JSON animations.** `src/assets/lottie/*.json` (e.g. the hero `syncing-file.json`) bake colors as normalized `[r,g,b,a]` arrays inside `fl`/`st` shape `c.k`. Parse the JSON and remap blue-dominant fills to coral; nothing else touches these.

**Card vs page distinction:** set `--card` to a soft gray (e.g. `220 20% 97%`) distinct from white `--background`, then normalize genuine card surfaces from `bg-white` to `bg-card`. Leave page-level `<section>` backgrounds and inner device-mockup screens white.

**Mobile (Expo)** has no Tailwind — central tokens in `constants/colors.ts` drive everything; set `card` to gray there too.

**Why:** a "change the brand color" task looks done after a hex swap but blue visibly survives in particle effects, gradients, and the hero Lottie. Verify with screenshots, not just grep.

**Brand mascot logo (PDF Genius):** public website headers, dashboard headers, and mobile `TopNav` are icon-only; full text-logo goes in both footers (web `FooterSection`, mobile `AppFooter`). The owner explicitly removed the public header's adjacent brand name after the redesign. Because the mark is coral on transparent, the Expo app icon + splash + Android adaptive-icon backgrounds MUST be white (`#ffffff`) in `app.json` — a coral logo on the old coral background is invisible. Web favicon/apple-touch-icon live in `public/`. Marketing/long pages exceed the 3000px screenshot cap, so footers can't be screenshotted directly — verify the page renders fully (no crash) instead, since the footer is the last element.

## Brand name: "PDF Genius" (June 2026)
The product is named **PDF Genius** across web (`pdf-convert-master`), mobile
(`pdf-convert-mobile`), and api-server copy/metadata. The old name was
"PDF Convert Master" — do not reintroduce it. Artifact titles in both
`.replit-artifact/artifact.toml` files are also "PDF Genius".

**Why:** user-required rename. The directory/slug `pdf-convert-master` /
`pdf-convert-mobile` are unchanged (internal only); only user-visible strings
changed.

## DashboardHeader is logo-only (no brand text)
`DashboardHeader.tsx` (web dashboard) intentionally renders ONLY the logo image
inside the clickable logo container — the `<h1>` brand text was removed at the
user's request so no brand text shows at any screen size. Do NOT re-add a brand
`<h1>` there. The public header is also logo-only per the owner's follow-up
request after the header redesign.
