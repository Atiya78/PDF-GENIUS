import { useEffect, useState } from "react";
import { Link } from "wouter";
import { OPEN_EVENT, applyConsent, hasGpc, readConsent, saveConsent } from "@/lib/consent";

/** Accept / reject / customise banner. Blocks Google Ads until accepted. */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    if (navigator.webdriver) return; // build-time snapshots and automated browsers
    const stored = readConsent();
    if (stored) applyConsent(stored.ads);
    else if (hasGpc()) saveConsent(false, "gpc");
    else setOpen(true);
    const onOpen = () => { setAds(readConsent()?.ads ?? false); setCustomize(true); setOpen(true); };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  if (!open) return null;
  const done = (choice: boolean) => { saveConsent(choice); setOpen(false); setCustomize(false); };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[44rem] rounded-[12px] border border-[#1c1917] bg-[#fffdf9] p-4 text-[#1c1917] shadow-[6px_6px_0_0_#f7433d] sm:inset-x-6 sm:bottom-6 sm:p-5"
      data-testid="banner-cookie-consent"
    >
      <p id="cookie-title" className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c8302a]">Cookies</p>
      <p className="mt-2 text-[14px] leading-relaxed text-[#3f3a35]">
        We use browser storage that the site needs to work. With your permission we also load Google Ads to measure our ads, which sets advertising cookies.{" "}
        <Link href="/cookie-policy" className="font-semibold underline decoration-[#f7433d]/50 underline-offset-2 hover:decoration-[#f7433d]">Cookie Policy</Link>
      </p>

      {customize && (
        <fieldset className="mt-4 divide-y divide-[#efe8dd] border-y border-[#e7e0d5]">
          <legend className="sr-only">Cookie categories</legend>
          <label className="flex items-start justify-between gap-4 py-3 text-sm">
            <span><span className="font-semibold">Strictly necessary</span><span className="block text-[#57534e]">Sign-in, your cookie choice, site updates. Always on.</span></span>
            <input type="checkbox" checked disabled className="mt-1 h-[18px] w-[18px] accent-[#8a837b]" aria-label="Strictly necessary (always on)" />
          </label>
          <label htmlFor="consent-ads" className="flex cursor-pointer items-start justify-between gap-4 py-3 text-sm">
            <span><span className="font-semibold">Advertising</span><span className="block text-[#57534e]">Google Ads conversion measurement and its cookies.</span></span>
            <input id="consent-ads" type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} className="mt-1 h-[18px] w-[18px] cursor-pointer accent-[#f7433d]" data-testid="checkbox-consent-ads" />
          </label>
        </fieldset>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => done(true)} className="min-h-11 rounded-[9px] bg-[#1c1917] px-4 text-sm font-semibold text-[#faf7f2] transition-colors hover:bg-[#c8302a]" data-testid="button-cookie-accept">Accept all</button>
        <button type="button" onClick={() => done(false)} className="min-h-11 rounded-[9px] border border-[#1c1917] px-4 text-sm font-semibold transition-colors hover:bg-[#1c1917] hover:text-[#faf7f2]" data-testid="button-cookie-reject">Reject non-essential</button>
        {customize ? (
          <button type="button" onClick={() => done(ads)} className="min-h-11 px-3 text-sm font-semibold underline decoration-[#d9d0c3] underline-offset-4 hover:decoration-[#f7433d]" data-testid="button-cookie-save">Save choices</button>
        ) : (
          <button type="button" onClick={() => setCustomize(true)} className="min-h-11 px-3 text-sm font-semibold underline decoration-[#d9d0c3] underline-offset-4 hover:decoration-[#f7433d]" data-testid="button-cookie-customize">Customize</button>
        )}
      </div>
    </div>
  );
}
