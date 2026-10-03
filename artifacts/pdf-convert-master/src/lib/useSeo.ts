import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Per-page SEO for the single-page app. React renders client-side, so each route
 * shares index.html's <head> unless we update it on navigation. This hook keeps
 * the document title, meta description, canonical link, Open Graph / Twitter tags
 * and (optionally) JSON-LD structured data in sync with the active route, so
 * Google indexes every URL with its own title + description instead of ~40
 * near-identical pages.
 */

const SITE_URL = "https://pdfgenius.app";
const BRAND = "PDF Genius";
const DEFAULT_TITLE = `${BRAND} — Free Online PDF Converter & Editor, No Signup`;
const DEFAULT_DESCRIPTION =
  "Convert, edit, merge, split & compress PDFs free in your browser. 100% free — no signup, no email, no credit card. Fast, secure, unlimited PDF tools.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export interface SeoOptions {
  /** Page-specific title. " | PDF Genius" is appended automatically unless the
   * title already contains the brand name. Omit to use the site default. */
  title?: string;
  /** Page meta description (~150–160 chars ideal). */
  description?: string;
  /** Absolute path for the canonical URL (e.g. "/pricing"). Defaults to the
   * current route's path. Always resolved against the production origin. */
  canonicalPath?: string;
  /** Absolute or site-relative OG/Twitter image. Defaults to the site OG image. */
  image?: string;
  /** When true, emits robots noindex,nofollow (use for auth/account pages). */
  noindex?: boolean;
  /** Optional JSON-LD structured data object(s) for this page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function setMetaByName(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaByProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

const JSONLD_ID = "seo-jsonld-page";

function setJsonLd(data: SeoOptions["jsonLd"]) {
  const existing = document.getElementById(JSONLD_ID);
  if (!data) {
    if (existing) existing.remove();
    return;
  }
  let el = existing as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = JSONLD_ID;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function toAbsolute(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}

export function useSeo(options: SeoOptions = {}) {
  const [location] = useLocation();
  const { title, description, canonicalPath, image, noindex, jsonLd } = options;

  useEffect(() => {
    const fullTitle = !title
      ? DEFAULT_TITLE
      : title.includes(BRAND)
        ? title
        : `${title} | ${BRAND}`;
    const desc = description || DEFAULT_DESCRIPTION;
    const path = canonicalPath ?? location ?? "/";
    const canonicalUrl = toAbsolute(path);
    const ogImage = image ? toAbsolute(image) : DEFAULT_IMAGE;

    document.title = fullTitle;
    setMetaByName("description", desc);
    setCanonical(canonicalUrl);

    setMetaByProperty("og:title", fullTitle);
    setMetaByProperty("og:description", desc);
    setMetaByProperty("og:url", canonicalUrl);
    setMetaByProperty("og:image", ogImage);

    setMetaByName("twitter:title", fullTitle);
    setMetaByName("twitter:description", desc);
    setMetaByName("twitter:image", ogImage);

    setMetaByName("robots", noindex ? "noindex,nofollow" : "index,follow");

    setJsonLd(jsonLd);
  }, [title, description, canonicalPath, image, noindex, jsonLd, location]);
}
