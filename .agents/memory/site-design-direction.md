---
name: Site-wide design direction
description: The whole web app (marketing, tools, auth, dashboard) uses the Education "document desk" look; rules for extending it.
---

The entire pdf-convert-master site now uses the "document desk" direction first built for the Education Zone: warm paper bg, cream sheets, graphite ink, coral #f7433d used sparingly, sage for success, mono tabular figures, hairline ruled rows, mono eyebrow labels, left label column on wide screens. Global tokens = `--desk-*` (styles/desk.css); `.edu-*` utilities are loaded globally; each area has its own css (marketing/tools/auth/dashboard.css).

**Why:** Owner (Nov 2026) asked to apply the Education redesign to the entire site incl. auth and dashboard so it looks professional and not AI-generated.

**How to apply:** New UI extends this vocabulary. Avoid pill badges, uniform centered icon-card grids, purple/blue accents, invented labels ("Recommended", "Most popular"), nested cards. Reveal must keep its position re-check fallback (IO alone left content hidden when lazy content above shrank). Tool bodies inside SEO landing pages must not keep full-viewport min-heights (tl-landing-body override).
