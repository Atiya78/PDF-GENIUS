---
name: Preview cold starts
description: Distinguishing a cold Vite startup timeout from an application or routing failure.
---
Do not treat Vite's “ready” message as proof that the proxied preview has finished starting. Initial source transformations can exceed the managed workflow's default startup window.

**Why:** A cold startup logged a listening Vite server but failed the preview health check and left the proxy returning 502. A longer managed startup window restored service without code or port changes.

**How to apply:** Inspect workflow output and proxy responses before modifying routing. Allow a longer startup window for the existing managed service when the evidence indicates cold startup. A loading-only capture is not confirmation that the page finished rendering.
