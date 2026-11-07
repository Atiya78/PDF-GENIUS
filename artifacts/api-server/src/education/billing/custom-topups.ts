import { EducationError } from "../config";

export const customTopUp = {
  minCents: 500, maxCents: 50_000, creditsPerUsd: 40, subscriberCreditsPerUsd: 50,
};
export function customTopUpQuote(amountCents: number, subscriber: boolean) {
  if (!Number.isSafeInteger(amountCents) || amountCents < customTopUp.minCents || amountCents > customTopUp.maxCents)
    throw new EducationError("Enter an Education top-up from $5 to $500, with at most two decimal places.");
  return {
    amount: amountCents,
    credits: Math.floor(amountCents * (subscriber ? customTopUp.subscriberCreditsPerUsd : customTopUp.creditsPerUsd) / 100),
  };
}
/** Non-catalog prices are trusted ONLY against an owned, server-created order. */
export function customPriceInfo(transaction: any, checkout: any) {
  if (checkout?.kind !== "custom" || checkout.transaction_id !== transaction.id ||
      !checkout.expected_product_id || !Number.isSafeInteger(checkout.expected_amount) || !Number.isSafeInteger(checkout.expected_credits)) return undefined;
  let regular: number, subscriber: number;
  try {
    regular = customTopUpQuote(checkout.expected_amount, false).credits;
    subscriber = customTopUpQuote(checkout.expected_amount, true).credits;
  } catch { return undefined; }
  if (checkout.expected_credits !== regular && checkout.expected_credits !== subscriber) return undefined;
  if (transaction.currency_code !== "USD" || !Array.isArray(transaction.items) || transaction.items.length !== 1) return undefined;
  const item = transaction.items[0];
  if (item.quantity !== 1 || item.price?.id !== checkout.price_id ||
      item.price?.product_id !== checkout.expected_product_id || item.price?.billing_cycle !== null ||
      item.price?.unit_price?.currency_code !== "USD" || item.price?.unit_price?.amount !== String(checkout.expected_amount) ||
      Number(transaction.details?.totals?.subtotal) !== checkout.expected_amount ||
      Number(transaction.details?.totals?.discount ?? 0) !== 0) return undefined;
  return { kind: "pack" as const, id: "custom", period: null,
    amount: checkout.expected_amount, credits: checkout.expected_credits, productId: checkout.expected_product_id };
}
