---
name: Static URL rendering boundary
description: Why webpage-to-PDF intentionally does not run remote JavaScript.
---

URL-to-PDF deliberately prints static HTML with public styles, images and fonts. Do not enable remote JavaScript merely to improve fidelity.

**Why:** The owner requires SSRF protection. Browser request interception is not a complete network sandbox: JavaScript can open WebSockets or use WebRTC outside the guarded HTTP-fetch path. Dynamic sites and login-dependent pages are an explicitly disclosed limitation, preferable to allowing access to internal services.

**How to apply:** Any future request to support JavaScript-driven pages must first establish an outbound network isolation policy covering all browser transports, DNS changes, redirects and resources. Keep backend validation authoritative; client URL validation only provides early feedback.
