/**
 * Cookie consent. Google Ads (gtag.js) is NOT loaded until the visitor accepts
 * advertising cookies; index.html only defines a dataLayer stub with Consent Mode
 * defaulting to "denied". Choices live in localStorage for 12 months.
 */
const KEY = "pdfgenius-consent";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const ADS_ID = "AW-18278560130";
export const OPEN_EVENT = "pdfgenius:cookie-settings";

export interface Consent { ads: boolean; ts: number; source: "banner" | "gpc" }

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void; __adsConsent?: boolean; __adsLoaded?: boolean };

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    if (typeof c?.ads !== "boolean" || typeof c.ts !== "number" || Date.now() - c.ts > MAX_AGE_MS) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveConsent(ads: boolean, source: Consent["source"] = "banner"): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ads, ts: Date.now(), source })); } catch { /* storage blocked */ }
  applyConsent(ads);
}

export function applyConsent(ads: boolean): void {
  const w = window as GtagWindow;
  w.__adsConsent = ads;
  const state = ads ? "granted" : "denied";
  w.gtag?.("consent", "update", { ad_storage: state, ad_user_data: state, ad_personalization: state });
  if (ads && !w.__adsLoaded) {
    w.__adsLoaded = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`;
    document.head.appendChild(s);
    w.gtag?.("js", new Date());
    w.gtag?.("config", ADS_ID);
  }
}

/** Global Privacy Control is treated as a rejection of advertising cookies. */
export function hasGpc(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
