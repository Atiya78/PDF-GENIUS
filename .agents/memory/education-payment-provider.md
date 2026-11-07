---
name: Education payment provider boundary
description: Owner's requirement to use Paddle only for Education Zone and preserve Dodo elsewhere.
---

Use Paddle for Education Zone payments only. Keep Dodo Payments for the rest of the website.

**Why:** The owner explicitly requested this provider split; connecting Paddle is not authorization to replace existing Dodo subscriptions or general credit checkout.

**How to apply:** Keep Education checkout and fulfillment scoped separately. Do not repurpose the general wallet or Dodo subscription fields.

Education credits are Education-only, separate from the general wallet. Education has its own Basic, Pro, and Max subscriptions through Paddle.

**Why:** The owner explicitly chose Education-only spending and provided the commercial rules below. The later price list supersedes the earlier proposed $5 for 500 credits.

**How to apply:** Preserve Dodo balances and subscription entitlements. Apply these rules only to Education; never grant Education benefits by changing the general website plan.

## Owner-specified commercial rules

- Monthly: Basic $9 / 500 credits per month; Pro $29 / 2,000; Max $79 / 6,000.
- Yearly: Basic $90; Pro $290; Max $790. Credits are still monthly, not all at once annually.
- One-time packs (RETIRED, see below): Small $5 / 200; Medium $22 / 1,000; Large $60 / 3,000; 20% subscriber discount.
- Purchased credits expire 12 months after purchase.
- Basic and non-subscribers pay 5 credits per quiz up to 20 questions and 20 source pages; +1 per extra 10 questions; +1 per extra 20 pages. Quiz regeneration costs 2 credits.
- Exam papers include the marking key and cost 15 credits up to 50 source pages; +3 per extra 50 pages. Regenerating a single section costs 3 credits. DOCX/PDF exports are free.
- Basic: maximum 20 quiz questions and 50 pages per upload.
- Pro: quiz generation included up to 30/day; exams cost credits; maximum 100 pages per upload; priority queue and commercial use.
- Max: quizzes included up to 30/day; exams included up to 10/day; maximum 300 pages per upload; fastest/priority queue, commercial use, and API access.
- Non-subscriber pack buyers follow Basic credit costs.

## Custom website top-ups

Both wallets support separate custom purchases of $5–$500 USD, with up to two
decimal places, at the SAME rate of 100 credits per $1 (general via Dodo,
Education via Paddle). No subscriber rate difference for custom top-ups.
Fixed Education packs were RETIRED at the owner's request (worse value than
100/$); keep their catalog entries only for settling/refunding past purchases.
Purchased Education credits still expire after 12 months.

**Why:** The owner said both wallets are "same 1$ for 100 credits", differing
only in which wallet the customer tops up. This superseded an earlier 40/$ (50/$
subscriber) Education rate.

**How to apply:** Keep custom checkout quotes, displayed rates, settlement and
wallet attribution consistent. Do not apply this web custom-amount rule to native
mobile IAP products, and never let a general Dodo plan grant the Education rate.

## Implementation defaults for unspecified rules

Included credits roll over within the already-paid billing period, not beyond it. Annual payments grant credits monthly, including missed months when the user next visits. Other tools retain five free successful generations per day, then cost one Education credit. Included-tool daily caps stop further generation until midnight UTC, rather than silently switching to paid credits. These are implementation defaults, not additional owner-specified commercial terms.

**Why:** The owner specified pack expiry and premium-tool tiers but not these edge cases. These defaults preserve the existing free allowance while preventing unexpected charges or granting unpaid future months.

**How to apply:** Keep these policies visible on Education pricing. Change them deliberately if the owner provides different rules; do not describe them as explicit user requirements.
