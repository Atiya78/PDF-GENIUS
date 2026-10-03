---
name: RevenueCat in-app purchases (mobile)
description: How real Google Play IAP (subs + credit packs) is wired in pdf-convert-mobile and why the web/native split + non-clobbering sync exist.
---

# RevenueCat IAP — mobile Expo app

Real Google Play purchases: recurring subs (Pro/Business activate the plan) +
consumable credit packs (add a server-owned credit balance). Server is the
source of truth; the client never grants entitlements itself.

## Web/native split (critical)
`react-native-purchases` has NO web build AND pulls a transitive dep
(`@revenuecat/purchases-typescript-internal`) that pnpm does not make resolvable
to Metro — importing it at runtime on web makes the Expo web bundle 500
(`UnableToResolveError`), which renders a blank page.

**Rule:** never import `react-native-purchases` for runtime on web. All native
SDK calls live behind `lib/purchasesClient.ts` (native, real SDK) with a sibling
`lib/purchasesClient.web.ts` stub (`purchasesAvailable=false`, throws/no-ops).
`lib/revenuecat.tsx` uses ONLY `import type` from `react-native-purchases` (type
imports are erased at build, so Metro never resolves the package on web).
Init soft-fails on web/Expo Go → `available=false` → purchase queries/mutations
gated by `enabled: available`; plan switching still works via `changePlan`.

**Why:** matches the existing pdfjs `.web.ts` native-stub pattern in this repo.

## Backend sync design
`POST /api/revenuecat/sync` (auth-required):
- **Non-clobbering:** `plan = resolvedPlan ?? user.plan` — only changes plan when
  an active sub entitlement exists; credit-only purchases never reset a plan.
- **404-tolerant:** unknown RC customer (404 on entitlements/purchases) → treat
  as empty, skip the purchase loop (don't hard-fail).
- **Idempotent credits:** `credit_grants.purchase_id` is unique; grant runs in a
  txn with `onConflictDoNothing` and only increments `users.credits` when the
  insert actually happened. Safe against retries/re-syncs.
- **Trigger policy:** client calls sync ONLY after a successful purchase/restore,
  NOT on login — otherwise a stale RC state could clobber a manually-switched
  plan. **Why:** no RevenueCat webhooks are wired, so there is no
  lapse-downgrade; running sync on login would let RC override deliberate manual
  plan changes.

## Web credit balance (read-only)
The web app (pdf-convert-master) DISPLAYS the credit balance on manage-plans
(PlansManager) read-only — no web purchasing. **Why:** credit packs are bought
via Google Play (RevenueCat), which can't run on web; user chose display-only
over a separate Stripe web checkout. Balance comes from the authed `user.credits`
(@workspace/db User type; backend returns the full user row on every auth
response). Mobile carries credits the same way (AuthContext persists the raw
backend user; MockUser has optional `credits`). Buying credits on web would
require a separate payment provider (Stripe/Whop), not Google Play.

## Scope gaps (accepted)
- No webhooks → no automatic downgrade when a sub lapses.
- Real Play billing needs a Play Console internal-testing upload + Google
  service-account link + a fresh EAS build; the RC Test Store works in Expo Go now.
- **EAS builds:** the store app only gets purchases if `eas.json` build env sets
  `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` / `_IOS_API_KEY` (public keys, safe to
  commit; fetchable via RC v2 `/apps/{id}/public_api_keys`). Missing key → init
  throws → "Credit packs aren't available here" even in the Play Store build.
  RC dashboard config (apps, products, offerings, entitlements) was verified
  complete via API; remaining store-side deps are Play Console products +
  service-account credentials in RC.
