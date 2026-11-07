/** Parse dollars without silently rounding sub-cent or nonnumeric inputs. */
export function usdToCreditCents(value: unknown, minCents = 500, maxCents = 50_000) {
  if (typeof value !== "string" && typeof value !== "number")
    throw new Error("Enter a USD amount with at most two decimal places.");
  const text = String(value).trim();
  if (text.length > 12 || !/^\d+(?:\.\d{1,2})?$/.test(text))
    throw new Error("Enter a USD amount with at most two decimal places.");
  const [dollars, fraction = ""] = text.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < minCents || cents > maxCents)
    throw new Error(`Enter an amount from $${minCents / 100} to $${maxCents / 100}.`);
  return cents;
}
