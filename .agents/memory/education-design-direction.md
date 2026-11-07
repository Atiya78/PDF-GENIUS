---
name: Education Zone design direction
description: Visual direction for /education pages and the prerender-safe scroll-reveal rule.
---

Education Zone (hub, pricing, 8 tool pages, home teaser) uses an "exam desk / editorial" look: warm paper background, ruled rows, mono figures, left-column eyebrow section labels, restrained coral #f7433d. Shared styles live in the education css + Reveal component.

**Why:** The owner said the old Education Zone "looks AI generated" and wanted a senior-designer finish (Nov 2026). Avoid: centered pill-badge heroes, uniform icon-card grids with "New" badges on every card, numbered 1-2-3 cards, pink washes, cards nested in cards, dark CTA banners.

**How to apply:** New Education UI should extend this direction, not the old card template. Scroll reveals must use the IntersectionObserver Reveal (content visible in prerendered HTML); never use framer-motion `whileInView`/`initial opacity:0` for page content, or prerendered SEO pages ship invisible text and full-page screenshots show blank areas.
