import express, { type Request, type Response } from "express";
import { z } from "zod/v4";
import { CreateEducationCheckoutBody } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { EducationError } from "../config";
import { catalog, plans, policies } from "./catalog";
import { customTopUp, customTopUpQuote } from "./custom-topups";
import { activeTier, billingTransaction, createEducationKey, ensureEducationBilling, getEducationAccount, lockAccount } from "./store";
import { billingEnabled, fulfillTransaction, handlePaddleEvent, paddle, paddleWebhookSecret, verifyPaddleSignature } from "./paddle";
import { throttle } from "../limits";
import { logger } from "../../lib/logger";

function fail(res: Response, error: unknown) {
  if (!(error instanceof EducationError)) logger.warn("Education billing request failed");
  res.status(error instanceof EducationError ? error.status : 503).json({
    error: error instanceof EducationError ? error.message : "Education billing is temporarily unavailable. Please try again.",
  });
}
export const paddleWebhook = express.Router();
paddleWebhook.post("/", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  try {
    const secret = await paddleWebhookSecret();
    if (!Buffer.isBuffer(req.body) || !verifyPaddleSignature(req.body, req.get("Paddle-Signature") ?? "", secret))
      throw new EducationError("Invalid Paddle signature.", 401);
    await ensureEducationBilling();
    await handlePaddleEvent(JSON.parse(req.body.toString("utf8")));
    res.json({ received: true });
  } catch (error) { fail(res, error); }
});

let clientTokenCache: { token: string; until: number } | undefined;
async function clientToken() {
  if (process.env.PADDLE_CLIENT_TOKEN) return process.env.PADDLE_CLIENT_TOKEN;
  if (clientTokenCache && clientTokenCache.until > Date.now()) return clientTokenCache.token;
  if (!process.env.PADDLE_API_KEY) return null;
  // Client tokens are intentionally PUBLIC. The API key never leaves the server.
  try {
    const tokens = await paddle<any[]>("/client-tokens?status=active&per_page=200");
    const token = tokens.find(token => token.name === "PDF Genius Education") ?? tokens[0];
    if (!token?.token) return null;
    clientTokenCache = { token: token.token, until: Date.now() + 30 * 60_000 };
    return token.token as string;
  } catch { return null; }
}
export const educationBillingRouter = express.Router();
educationBillingRouter.get("/config", async (_req, res) => {
  const token = await clientToken();
  res.json({ enabled: billingEnabled() && Boolean(token), clientToken: token,
    environment: process.env.PADDLE_ENVIRONMENT === "sandbox" ? "sandbox" : "live", plans, packs: [], policies, customTopUp }); // Fixed packs retired: custom top-ups only.
});
educationBillingRouter.use((req, res, next) => {
  if (!req.user || !req.headers.authorization) { res.status(401).json({ error: "Please sign in to manage Education billing." }); return; }
  try { throttle(req, `education-billing:${req.user.id}`, req.method === "GET" ? 3000 : 120); next(); } catch (error) { fail(res, error); }
});
educationBillingRouter.get("/account", async (req, res) => {
  try { res.json(await getEducationAccount(req.user!.id)); } catch (error) { fail(res, error); }
});
function checkoutBase(req: Request) {
  // Production can configure an explicitly approved checkout website. Dev
  // host fallback supports preview without hardcoding localhost into the UI.
  const configured = process.env.PADDLE_CHECKOUT_BASE_URL ?? process.env.PUBLIC_APP_URL;
  if (configured) {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:") throw new EducationError("Education checkout requires an HTTPS website.", 503);
    return parsed.origin + parsed.pathname.replace(/\/$/, "");
  }
  const host = req.get("x-forwarded-host")?.split(",")[0].trim() ?? req.get("host");
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) throw new EducationError("Education checkout website is not configured.", 503);
  return `https://${host}`;
}
educationBillingRouter.post("/checkout", async (req, res) => {
  try {
    throttle(req, `education-checkout:${req.user!.id}`, 15);
    if (!billingEnabled() || !(await clientToken())) throw new EducationError("Education payments are not ready yet. Please contact support.", 503);
    const input = CreateEducationCheckoutBody.safeParse(req.body);
    if (!input.success) throw new EducationError("Choose an Education plan or a custom top-up from $5 to $500.");
    // Fixed packs were retired by the owner (worse value than 100 credits/$1 custom top-ups).
    // Their catalog entries stay so earlier pack purchases still settle and refund correctly.
    if (input.data.kind === "pack") throw new EducationError("Fixed Education credit packs are no longer sold. Choose a custom top-up from $5 to $500 instead.");
    const result = await billingTransaction(async client => {
      const account = await lockAccount(client, req.user!.id);
      const purchase = input.data;
      if (purchase.kind === "plan" && account.subscription_id && !["canceled", "none"].includes(account.status))
        throw new EducationError("Manage your existing Education subscription through the Paddle customer portal instead of creating a second subscription.", 409);
      const quote = purchase.kind === "custom" ? customTopUpQuote(purchase.amountCents, activeTier(account) !== "none") : null;
      const price = purchase.kind === "plan" ? catalog.plans[purchase.id][purchase.period ?? "month"]
        : purchase.kind === "pack" ? catalog.packs[purchase.id][activeTier(account) === "none" ? "standard" : "subscriber"]
        : { priceId: "", amount: quote!.amount };
      if (purchase.kind === "plan" && (account as any).checkout_pending_until > new Date()) {
        const pending = (await client.query(`SELECT transaction_id FROM education_billing_checkouts
          WHERE user_id=$1 AND kind='plan' AND price_id=$2 AND status='pending' AND created_at>now()-interval '30 minutes'
          ORDER BY created_at DESC LIMIT 1`, [req.user!.id, price.priceId])).rows[0];
        if (!pending) throw new EducationError("An Education subscription checkout is already open. Complete it or wait 30 minutes before starting a different plan.", 409);
        const transaction = await paddle(`/transactions/${pending.transaction_id}`);
        if (["draft", "ready"].includes(transaction.status))
          return { url: transaction.checkout?.url ?? "", transactionId: transaction.id };
        throw new EducationError("Your last Education checkout is being reconciled. Refresh your account shortly.", 409);
      }
      const customer = account.customer_id ?? (await paddle("/customers", { email: req.user!.email, name: req.user!.name || undefined })).id;
      const transaction = await paddle("/transactions", {
        items: [purchase.kind === "custom"
          ? { price: { product: { name: "PDF Genius Education credits", tax_category: "saas",
                description: "Custom Education-only credit top-up. Purchased credits expire after 12 months." },
              description: `${quote!.credits} Education credits — custom top-up`,
              billing_cycle: null, tax_mode: "external", unit_price: { amount: String(quote!.amount), currency_code: "USD" },
              quantity: { minimum: 1, maximum: 1 } }, quantity: 1 }
          : { price_id: price.priceId, quantity: 1 }], customer_id: customer,
        collection_mode: "automatic", currency_code: "USD",
        custom_data: { scope: "education", userId: req.user!.id, kind: purchase.kind },
        checkout: { url: `${checkoutBase(req)}/education/pricing` },
      });
      if (!transaction.id || !transaction.checkout?.url) throw new EducationError("Paddle could not create an Education checkout. Please contact support.", 503);
      const priceId = purchase.kind === "custom" ? transaction.items?.[0]?.price?.id : price.priceId;
      const productId = purchase.kind === "custom" ? transaction.items?.[0]?.price?.product_id : null;
      if (!priceId || (purchase.kind === "custom" && !productId))
        throw new EducationError("Paddle did not return the Education top-up price. Please retry.", 503);
      await client.query(`INSERT INTO education_billing_checkouts(transaction_id,user_id,kind,price_id,expected_amount,expected_credits,expected_product_id)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [transaction.id, req.user!.id, purchase.kind, priceId, price.amount, quote?.credits ?? null, productId]);
      await client.query(`UPDATE education_billing_accounts SET customer_id=$2,
        checkout_pending_until=CASE WHEN $3='plan' THEN now()+interval '30 minutes' ELSE checkout_pending_until END WHERE user_id=$1`,
        [req.user!.id, customer, purchase.kind]);
      return { url: transaction.checkout.url, transactionId: transaction.id };
    });
    res.json(result);
  } catch (error) { fail(res, error); }
});
educationBillingRouter.get("/checkout/:id", async (req, res) => {
  try {
    const id = z.string().regex(/^txn_[a-z0-9]{26}$/).parse(req.params.id);
    await ensureEducationBilling();
    const owned = (await pool.query("SELECT transaction_id FROM education_billing_checkouts WHERE transaction_id=$1 AND user_id=$2", [id, req.user!.id])).rows[0];
    if (!owned) throw new EducationError("Education checkout not found.", 404);
    const status = await fulfillTransaction(id);
    res.json({ status, balance: (await getEducationAccount(req.user!.id)).balance });
  } catch (error) { fail(res, error); }
});
educationBillingRouter.post("/portal", async (req, res) => {
  try {
    const account = await billingTransaction(client => lockAccount(client, req.user!.id));
    if (!account.customer_id || !account.subscription_id) throw new EducationError("No Education subscription is available to manage.", 404);
    const portal = await paddle(`/customers/${account.customer_id}/portal-sessions`, { subscription_ids: [account.subscription_id] });
    const url = portal.urls?.general?.overview;
    if (!url || !url.startsWith("https://")) throw new EducationError("Paddle could not open the customer portal.", 503);
    res.json({ url });
  } catch (error) { fail(res, error); }
});
educationBillingRouter.post("/api-keys", async (req, res) => {
  try {
    const input = z.object({ name: z.string().trim().min(1).max(80) }).safeParse(req.body);
    if (!input.success) throw new EducationError("Give your API key a name of up to 80 characters.");
    res.status(201).json(await createEducationKey(req.user!.id, input.data.name));
  } catch (error) { fail(res, error); }
});
educationBillingRouter.delete("/api-keys/:id", async (req, res) => {
  try {
    const id = z.uuid().safeParse(req.params.id);
    if (!id.success) throw new EducationError("Invalid Education API key.");
    await ensureEducationBilling();
    const result = await pool.query("DELETE FROM education_api_keys WHERE id=$1 AND user_id=$2 RETURNING id", [id.data, req.user!.id]);
    if (!result.rowCount) throw new EducationError("Education API key not found.", 404);
    res.json({ success: true });
  } catch (error) { fail(res, error); }
});
