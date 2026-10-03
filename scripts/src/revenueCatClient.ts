import { createClient } from "@replit/revenuecat-sdk/client";
import { ReplitConnectors } from "@replit/connectors-sdk";

/**
 * Creates an authenticated RevenueCat v2 REST client using a direct secret key
 * for external hosting or Replit's attached connection.
 *
 * This is for server-side / script use ONLY. The secret key must never be
 * shipped to the mobile client.
 */
export function getUncachableRevenueCatClient() {
  const apiKey = process.env.REVENUECAT_API_KEY?.trim();

  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    ...(apiKey
      ? { headers: { Authorization: `Bearer ${apiKey}` } }
      : { fetch: new ReplitConnectors().createProxyFetch("revenuecat") }),
  });
}
