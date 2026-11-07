---
name: Dodo Payments web billing
description: How real subscription billing works in the pdf-convert web app (checkout/portal/webhook), and the non-obvious constraints.
---

# Dodo Payments (web app billing)

Replaces the old no-payment plan switch. Plans: free $0 / pro $9 / business $29.

## Source of truth
Dodo subscription state is the source of truth for `users.plan`; the webhook
mirrors it. The DB tracks `dodoCustomerId` + `dodoSubscriptionId` on users
(nullable text cols, pushed to Supabase via `pnpm --filter @workspace/db run push`).

## Flow
- Upgrade (free→paid): `POST /api/billing/checkout` → hosted Dodo checkout redirect.
- Switch/cancel (existing subscriber): Dodo **customer portal** only (`/api/billing/portal`).
- `/api/account/plan` is restricted to free-only and rejects a free switch while
  `dodoSubscriptionId` is set — this is what closes the monetization hole.
- `/api/billing/checkout` refuses a second checkout when a sub already exists.

## Webhook (`/api/billing/dodo/webhook`)
- No auth; authenticity = Standard-Webhooks HMAC verified against
  `DODO_PAYMENTS_WEBHOOK_KEY` over the RAW body (captured in app.ts express.json `verify`).
- Acted-on events: `subscription.*` (plan state) AND `payment.succeeded` (web credit
  purchases — see Buy Credits below). Mobile credit packs stay on RevenueCat.
- **Plan tier = product id, not metadata.** `getPlanForProductId(product_id)` is
  authoritative; `metadata.planId` is only a fallback (it goes stale after a
  portal plan switch).
- **Gate downgrades by subscription_id match.** On cancelled/expired/failed, only
  downgrade to free if the event's `subscription_id` equals the user's tracked
  `dodoSubscriptionId` — otherwise a delayed/out-of-order cancel for a replaced
  sub would wrongly revoke paid access.
- **Grant on subscription STATUS, never event type.** Plan changes are driven by
  the payload's top-level `sub.status` (`pending|active|on_hold|cancelled|failed|
  expired`), NOT by `event.type`. Only `active` grants/keeps a paid plan;
  cancelled/expired/failed downgrade (with the trackedSub guard above);
  pending/on_hold/unknown do nothing. **Why:** Dodo fires `subscription.active`/
  `subscription.updated` during creation and payment retries even when the first
  charge has NOT settled — keying on event type handed paid access to users whose
  payment FAILED (real reported billing bug). Cancel-at-period-end stays correct:
  access is retained while status remains `active`.
**Why (overall):** these guards were caught in architect review / production bug
reports; without them stale or unsettled events corrupt plan state.

## Config (env vars, not secret except keys)
- Secrets: `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`.
- Env: `DODO_PRODUCT_PRO`, `DODO_PRODUCT_BUSINESS`, `DODO_PAYMENTS_ENVIRONMENT`
  (`test_mode`|`live_mode`). `isBillingConfigured()` = api key + ≥1 product id;
  `/api/billing/config` exposes `enabled` to the web UI.
- User must create the webhook in the Dodo dashboard → subscription events →
  endpoint `https://pdfgenius.app/api/billing/dodo/webhook`.

## Buy Credits (web pay-what-you-want, one-time)
Web users can buy a custom $ of credits (was mobile-only before). Rate
`CREDITS_PER_USD=100` (1 credit = 1¢), `MIN_CREDITS_USD=5`, `MAX_CREDITS_USD=500`
— all in `dodo.ts`.
- Product: a single **pay_what_you_want one-time** Dodo product; id in env
  `DODO_PRODUCT_CREDITS`. Checkout passes the chosen `amount` (cents) on the cart
  line so the customer can't change it, plus metadata `{userId,kind:"credits",credits,amountCents}`.
- Endpoint: `POST /api/billing/credits-checkout` (authenticated, validates min/max),
  returnUrl `?checkout=credits-success` → web polls balance on return.
- **Credits UI lives on its OWN page** `/dashboard/buy-credits` (component
  `CreditPurchaseCard`), separate from Manage Plans. The credits-checkout
  return/cancel URLs MUST point at wherever that card is mounted, and only ONE
  component may handle `?checkout=credits-success` (the card owns it) — Manage
  Plans only handles plan `success`/`cancelled`. **Why:** two mounted handlers =
  double toast/double poll; a mismatched returnUrl lands the user on a page with
  no handler so the balance never refreshes.
- **Grant ONLY in the `payment.succeeded` webhook, idempotent on `payment_id`**
  (`storage.grantCreditsForPurchase`, unique `credit_grants.purchase_id`).
- **Fulfillment trust boundary (architect-required):** never grant on metadata
  alone. Gate on the settled `product_cart` actually containing
  `DODO_PRODUCT_CREDITS`, and for USD recompute credits from the **pre-tax** settled
  amount (`total_amount - tax`), not `metadata.credits` (metadata is only a
  cross-check / non-USD fallback). **Why:** metadata is attacker-influenced;
  discounts/coupons/tax can make it diverge from money actually collected.
- **Dashboard webhook MUST also subscribe to `payment.succeeded`** (it was
  subscription.* only) or credits never grant in test/live.

## SDK product creation shape (recurring)
`client.products.create({ name, tax_category:"saas", price:{ type:"recurring_price",
price: dollars*100, currency:"USD", payment_frequency_interval:"Month",
subscription_period_interval:"Month", ... } })`. Going live = recreate products in
live_mode and swap the product-id env vars + `DODO_PAYMENTS_ENVIRONMENT=live_mode`.

## Yearly plans
- Yearly Dodo products exist (live mode): env `DODO_PRODUCT_PRO_YEARLY` / `DODO_PRODUCT_BUSINESS_YEARLY`; Pro $90/yr, Business $290/yr (2 months free vs monthly).
- `getProductIdForPlan(planId, period)` picks the product; reverse lookup maps yearly product ids to the SAME tier ("pro"/"business") — webhook grants tier, period is metadata-only.
- `/api/billing/checkout` accepts `{planId, period:"month"|"year"}`; plan catalog carries `yearlyPrice`; web PlansManager has a Monthly/Yearly toggle.
- These env vars must also be set on Railway prod or yearly checkout 503s there.

## Checkout failure diagnosis (Nov 2026)
Prod credit checkout returned the generic "Could not start checkout." and dev has NO Dodo API key, so it could not be reproduced here. The 502 now includes Dodo's own error text (dodoErrorMessage) and logs it; a stored `dodoCustomerId` that Dodo rejects (e.g. test-mode id in live_mode) is retried once by email. Usual suspects: DODO_PRODUCT_CREDITS not a pay-what-you-want product, or created in the other mode.
**How to apply:** ask the owner for the exact toast text / Railway log line before changing checkout logic further.

## Two wallets UI
/dashboard/buy-credits shows both wallets side by side (PDF tools = users.credits + Dodo plan; Education = Paddle wallet + Education tier). Owner wants them visibly separate with separate credit and subscription accounting.
