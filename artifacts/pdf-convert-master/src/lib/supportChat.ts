import { isToolProcessing, PROCESSING_EVENT } from "./toolProcessing";
import { toast } from "@/hooks/use-toast";

interface TawkApi {
  onLoad?: () => void;
  onChatMaximized?: () => void;
  onChatMinimized?: () => void;
  customStyle?: { zIndex: number };
  maximize?: () => void;
  hideWidget?: () => void;
  showWidget?: () => void;
  isChatMaximized?: () => boolean;
  setAttributes?: (attributes: Record<string, string>, callback: (error?: unknown) => void) => void;
  logout?: (callback: () => void) => void;
}
declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
    __PDF_GENIUS_PRERENDER__?: boolean;
  }
}

const WIDGET = "6a61bfc885c9821d4774b083/1ju6taase";
let started = false;
let ready = false;
let openRequested = false;
let session: { token: string } | null = null;
let identityPending = false;
let identifiedToken: string | null = null;
let animationFrame = 0;
let widgetVisible: boolean | null = null;
let openFallback: ReturnType<typeof setTimeout>;
const unavailable = () => toast({
  title: "Chat could not load",
  description: "Use the Support page link in the footer for help. Your current file stays on this page.",
});
function setWidgetVisibility(visible: boolean) {
  if (!ready || widgetVisible === visible) return;
  widgetVisible = visible;
  if (visible) window.Tawk_API?.showWidget?.();
  else window.Tawk_API?.hideWidget?.();
}

async function identifyAccount() {
  const current = session;
  if (!current || identityPending || identifiedToken === current.token || !ready) return;
  identityPending = true;
  try {
    // Only a verified account's name/email/hash. No tool state or file metadata.
    const response = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/auth/chat-identity`, {
      headers: { Authorization: `Bearer ${current.token}` },
      cache: "no-store",
    });
    if (!response.ok) return;
    const identity = await response.json();
    if (session !== current || typeof identity.email !== "string" || !/^[a-f0-9]{64}$/.test(identity.hash)) return;
    const attributes: Record<string, string> = { email: identity.email, hash: identity.hash };
    if (identity.name) attributes.name = String(identity.name).slice(0, 255);
    window.Tawk_API?.setAttributes?.(attributes, error => {
      if (!error && session === current) identifiedToken = current.token;
    });
  } catch {
    // Identity configuration must never prevent anonymous/offline support.
  } finally {
    identityPending = false;
  }
}

export function setSupportSession(next: { token: string } | null) {
  if (session?.token === next?.token) return;
  const hadSession = Boolean(session);
  session = next;
  identifiedToken = null;
  if (hadSession && !next) window.Tawk_API?.logout?.(() => {});
  if (next && window.Tawk_API?.isChatMaximized?.()) void identifyAccount();
}

function placeWidget() {
  animationFrame = 0;
  if (!ready) return;
  const api = window.Tawk_API;
  const mobile = window.innerWidth < 768;
  const cookie = document.querySelector<HTMLElement>('[data-cookie-banner], #cookie-banner, [aria-label="Cookie consent"]');
  const cookieRect = cookie?.getBoundingClientRect();
  const cookieHeight = cookieRect && cookieRect.height > 0 && cookieRect.bottom >= window.innerHeight - 5 ? cookieRect.height : 0;
  let bottom = mobile ? cookieHeight + 100 : cookieHeight + 20;
  let collision = bottom > window.innerHeight - 160;
  if (mobile && !api?.isChatMaximized?.()) {
    const actions = [...document.querySelectorAll<HTMLElement>("[data-upload-action]")];
    // Move the closed launcher above any visible upload action. If there is no
    // safe vertical space, hide it until scrolling makes room.
    for (let attempt = 0; attempt < 8; attempt++) {
      const top = window.innerHeight - bottom - 64;
      const action = actions.map(element => element.getBoundingClientRect()).find(rect =>
        rect.width > 0 && rect.left < window.innerWidth - 12 && rect.right > window.innerWidth - 80 &&
        rect.top < top + 64 && rect.bottom > top);
      if (!action) { collision = false; break; }
      bottom = window.innerHeight - action.top + 20;
      collision = bottom > window.innerHeight - 160;
      if (collision) break;
    }
  }
  if (bottom > window.innerHeight - 160) collision = true;
  const positioned = new Set<HTMLElement>();
  for (const frame of document.querySelectorAll<HTMLIFrameElement>('iframe[title="chat widget"], iframe[src*="tawk.to"]')) {
    let element: HTMLElement | null = frame;
    while (element && element !== document.body) {
      if (getComputedStyle(element).position === "fixed") {
        if (!positioned.has(element)) {
          element.style.setProperty("bottom", `${bottom}px`, "important");
          element.style.setProperty("right", mobile ? "12px" : "20px", "important");
          positioned.add(element);
        }
        break;
      }
      element = element.parentElement;
    }
  }
  if (isToolProcessing() || collision) setWidgetVisibility(false);
  else {
    setWidgetVisibility(true);
    if (openRequested) {
      openRequested = false;
      api?.maximize?.();
      void identifyAccount();
    }
  }
}

function schedulePlacement() {
  if (isToolProcessing()) setWidgetVisibility(false);
  if (!animationFrame) animationFrame = requestAnimationFrame(placeWidget);
}

function loadWidget() {
  if (started || window.__PDF_GENIUS_PRERENDER__) return;
  started = true;
  const api = window.Tawk_API = window.Tawk_API || {};
  // Official customStyle supports zIndex, not dynamic position/yOffset.
  api.customStyle = { zIndex: 1000 };
  api.onLoad = () => { ready = true; clearTimeout(openFallback); schedulePlacement(); };
  api.onChatMaximized = () => { void identifyAccount(); schedulePlacement(); };
  api.onChatMinimized = schedulePlacement;
  window.Tawk_LoadStart = new Date();
  const script = document.createElement("script");
  script.id = "pdf-genius-support-chat";
  script.async = true;
  script.src = `https://embed.tawk.to/${WIDGET}`;
  script.crossOrigin = "anonymous";
  script.onerror = () => {
    if (openRequested) unavailable();
  };
  document.head.appendChild(script);
}

export function openSupportChat() {
  openRequested = true;
  loadWidget();
  if (ready) schedulePlacement();
  else {
    clearTimeout(openFallback);
    openFallback = setTimeout(() => {
      if (!ready && openRequested) unavailable();
    }, 12000);
  }
}

export function initializeSupportChat() {
  if (window.__PDF_GENIUS_PRERENDER__) return () => {};
  let timer: ReturnType<typeof setTimeout>;
  const trigger = () => {
    clearTimeout(timer);
    for (const event of ["scroll", "click", "keydown"]) window.removeEventListener(event, trigger);
    loadWidget();
  };
  for (const event of ["scroll", "click", "keydown"]) window.addEventListener(event, trigger, { passive: true });
  timer = setTimeout(trigger, 5000);
  window.addEventListener("scroll", schedulePlacement, { passive: true });
  window.addEventListener("resize", schedulePlacement);
  window.addEventListener(PROCESSING_EVENT, schedulePlacement);
  const observer = new MutationObserver(schedulePlacement);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    clearTimeout(timer);
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    observer.disconnect();
    for (const event of ["scroll", "click", "keydown"]) window.removeEventListener(event, trigger);
    window.removeEventListener("scroll", schedulePlacement);
    window.removeEventListener("resize", schedulePlacement);
    window.removeEventListener(PROCESSING_EVENT, schedulePlacement);
  };
}