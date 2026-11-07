# Education billing with Paddle

Education has a separate wallet and subscription. Dodo subscriptions and the
general web/mobile credit balance are not migrated or modified.

## Account setup

The connected **live** Paddle account has the six Education products and twelve
prices referenced by the Education catalog. This catalog is not a sandbox
catalog. Changing to sandbox requires creating matching sandbox products and
replacing the price IDs; never mix account environments.

The notification destination is:

`https://pdfgenius.app/api/education/billing/paddle/webhook`

It subscribes to settled transactions, subscription lifecycle changes and
refund adjustments. It accepts real platform events, not simulated events.

## Railway rollout

Deploy the updated web build and API together using the existing Railway setup.
The workspace changes do not update Railway automatically.

Set these Railway variables:

| Variable | Value |
| --- | --- |
| `PADDLE_API_KEY` | Secret server API key for the same live Paddle account. Never commit it. |
| `PADDLE_ENVIRONMENT` | `live` |
| `PADDLE_NOTIFICATION_ID` | `ntfset_01m6rmm3wanea3fyqp3a4vzb9q` |
| `PADDLE_CHECKOUT_BASE_URL` | `https://pdfgenius.app` |

The API key needs read access to products/prices, transactions, subscriptions,
adjustments, client tokens and notification settings; write access to customers,
transactions and customer portal sessions. Product/token/notification creation
was performed during setup through the connected account, not during purchases.

The application obtains the PUBLIC Paddle.js client token from the authenticated
server API. Optionally set `PADDLE_CLIENT_TOKEN` to a public client token if this
API key cannot list client tokens.

For webhook verification, the server retrieves the configured notification's
signing secret through Paddle's authenticated API, caches it briefly in memory,
and never returns or logs it. Alternatively, securely configure
`PADDLE_WEBHOOK_SECRET` from that destination's secret field. This optional
override is a secret, not an ordinary configuration value.

Make sure Paddle has approved `https://pdfgenius.app` for checkout and that the
account is enabled to take live payments. `/education/pricing` is the payment-link
page and initializes Paddle.js. Live checkout in a development iframe may be
restricted by Paddle/browser domain and payment policies; verify a real purchase
on the approved production domain when ready.

## Billing behavior

- Custom website top-ups accept $5–$500 USD per transaction, in whole cents.
  Both wallets use the same rate of 100 credits per $1: general credits through
  Dodo and Education credits through Paddle. There is no subscriber rate difference
  for custom top-ups. These are separate, non-transferable wallets; the customer
  chooses which one to top up. Fixed Education packs are unchanged.
  Applicable tax is additional; it never buys extra credits.
- Custom Paddle purchases use transaction-specific, non-catalog products/prices.
  The server saves the returned product/price IDs, exact amount and credit quote.
  Fulfillment compares the actual completed transaction to that saved order,
  ignores metadata credit counts, and is idempotent across polling and webhooks.
  Custom top-ups do not accept additional discount codes. Refunds remove the
  corresponding unused Education credits, just as for fixed packs.
  No extra environment variables or manually created custom-price catalog entries
  are required. Redeploy both the web app and API to enable this feature.
- Basic: $9/month or $90/year, 500 credits/month.
- Pro: $29/month or $290/year, 2,000 credits/month.
- Max: $79/month or $790/year, 6,000 credits/month.
- Packs: $5/200, $22/1,000, $60/3,000. Active Education subscribers receive
  the server-selected 20%-discounted price, not a client-supplied discount.
- Purchased credits expire 12 calendar months after purchase.
- Included credits accrue monthly and roll over only within the already-paid
  billing period. Annual purchases do not grant all twelve months immediately.
- Quiz: 5 credits up to 20 questions/20 source pages, +1 per additional ten
  questions and +1 per additional twenty source pages. Repeating a successfully
  generated source costs 2 credits. Identical request-ID retries
  replay the result for free; they are not a new regeneration.
- Exam: 15 credits up to 50 source pages, +3 per additional 50 pages.
  Regenerating a section or replacing one question costs 3 credits.
- Basic/non-subscriber quiz limit: 20 questions. Upload page caps: 50
  Basic/non-subscriber, 100 Pro, 300 Max. Existing quiz generation supports up to
  50 questions on Pro/Max.
- Pro includes 30 quiz generations/day. Max includes 30 quiz and 10 exam
  generations/day. Regeneration uses one included generation. Caps reset at UTC
  midnight; reaching a cap does not silently start spending credits.
- Other Education tools retain five free successful generations/day, then one
  Education credit per successful result. Exports are free.
- Pending reservations protect balances from concurrent generation; final credit
  settlement and saved results share a transaction. Failure releases reservations.
- Plan benefits require an active subscription AND an already-paid period.
  Redirects, metadata, pending payments and lifecycle events alone grant nothing.
- Repeated webhooks and checkout reconciliation cannot mint duplicate credits.
  Approved refunds remove corresponding unused credits. Past-due/paused/canceled
  subscriptions lose included access; independently purchased credits remain.
- Priority scheduling is non-preemptive: Max before Pro before standard, with
  aging to prevent starvation. Running requests are not interrupted.
- Max API keys are random, stored only as SHA-256 hashes, capped at five per
  account, and invalid if Max expires. Use `X-Education-API-Key` with the same
  Education generation endpoints and request bodies. Keys cannot manage billing.

Credit rollover, one-credit pricing for the other tools and a hard stop at daily
caps are implementation defaults for rules not otherwise specified by the owner.
They are displayed in Education pricing and can be changed deliberately later.

## Storage and deployment checks

Education billing creates isolated, additive PostgreSQL tables on first use.
It uses the existing shared database connection; no existing user balance or
Dodo subscription columns are overwritten. Keep the existing Supabase
configuration and database create-table permissions.

`pnpm --filter @workspace/api-server exec tsx --test tests/education-billing.test.ts`

`pnpm --filter @workspace/api-server exec tsx --test tests/credit-topups.test.ts`

These deterministic tests mock payment responses and exercise prices, access
limits, signature checks, monthly grants, reservations, idempotent fulfillment
and queue priority. They do not charge cards or prove a live purchase succeeds.
No browser tests or Education screenshots were run during implementation.
