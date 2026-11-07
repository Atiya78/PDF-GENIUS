---
name: Web auth dark-sheet design (parity with mobile)
description: How pdf-convert-master web /signin /signup mirror the mobile AuthSheet
---

# Web auth design

**SUPERSEDED (Nov 2026):** owner asked for auth to match the site-wide paper direction; the dark sheet is replaced by a paper split layout (AuthShell in AuthCard, shared by forgot/reset). Still standalone (no nav), same flow/steps/OTP/Google/Apple behaviour below. Web no longer visually mirrors mobile.


The web `/signin` and `/signup` pages intentionally use a DARK sheet design
(`#171c28` bg, `#1f2533` fields, `#2c3344` borders, coral `#f7433d` primary),
independent of the otherwise light web theme — this mirrors the mobile `AuthSheet`.

- Shared component `AuthCard` (mode `signin|signup`) backs both pages; the page
  files are thin wrappers. Progressive email → credentials step, Google/Apple
  social (Google REAL OAuth; Apple intentionally NOT set up — tapping shows a
  `result==="unavailable"` apple-unavailable.json Lottie + "Apple sign-in unavailable"
  + "Got it" dismiss, mirrored on mobile), SIGN_UP_XML illustration, forgot-password (signin),
  terms/privacy links, error + full-screen welcome result states.
- Lottie via `AuthResultIcon` (welcome/error/success) on top of the existing
  `LottieIcon` (`lottie-react`); JSON copied from mobile `assets/lottie`.
- **Render standalone** — `/signin` and `/signup` are NOT wrapped in `DynamicLayout`
  (no marketing nav), matching the mobile full-screen sheet. AuthCard has its own
  close (X) → navigates to `/`.

**Why standalone:** the marketing nav broke the immersive full-screen sheet feel
and duplicated the close affordance.

**Signup is now 2-step (OTP):** `AuthContext.signup()` only requests an emailed
code (no token); there is an `otp` step in AuthCard, and `verifySignupOtp(email,code)`
consumes `data.data.{user,token}` and persists like signin, then the welcome screen
greets by name and lands in the dashboard. See [Signup OTP verification](signup-otp-verification.md).
Treat a verify success missing user/token as a failure (no false welcome).
