// Robust file download helpers. The server returns converted files from
// `/api/download/:jobId` with `Content-Disposition: attachment`. Triggering the
// download by navigating an <a href> to that URL (or `window.open`) is
// unreliable: inside the Replit preview / canvas iframe those navigations and
// popups are frequently blocked by the iframe sandbox or the browser's popup
// blocker, so the file never actually saves.
//
// Fetching the file as a Blob and clicking a temporary object-URL <a download>
// works in those embedded contexts because the navigation stays same-document.

import { getAuthToken } from "./authedFetch";

// iOS Safari (iPhone/iPad) ignores the <a download> attribute for blob: URLs:
// instead of saving the file it opens it inline in the tab, so the user never
// gets a real download. The reliable path on iOS is the Web Share sheet, which
// offers "Save to Files"/Photos. Detect iOS (incl. iPadOS, which reports as a
// Mac) so we only change behavior there and leave desktop/Android untouched.
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iPhoneClass = /iPad|iPhone|iPod/.test(ua);
  const iPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iPhoneClass || iPadOS;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  // Prefer RFC 5987 `filename*=UTF-8''...` when present.
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through to plain filename */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

/**
 * Fetches the file at `url` as a Blob, sending the signed-in user's token for
 * same-origin API downloads so the backend can authorize access to files owned
 * by that user (`/api/download` only serves a user-owned job to its owner).
 * Guest downloads send no token. Strict origin check (via URL parsing, not
 * prefix matching) so the bearer token is never leaked to a look-alike origin.
 *
 * Rejects with a clear, actionable message if the request fails.
 */
export async function fetchFileBlob(
  url: string,
): Promise<{ blob: Blob; name: string | null }> {
  const token = getAuthToken();
  let sameOrigin = false;
  try {
    sameOrigin = new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    sameOrigin = false;
  }
  const init: RequestInit | undefined =
    token && sameOrigin
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined;
  const res = await fetch(url, init);
  if (!res.ok) {
    // 401/403 mean the file belongs to a user and this caller isn't that
    // signed-in user (e.g. a guest, or someone who logged out): surface a
    // clear, actionable message instead of a raw status code.
    if (res.status === 401 || res.status === 403) {
      throw new Error("Please log in to download this file.");
    }
    throw new Error(
      res.status === 404
        ? "This file is no longer available. Please run the conversion again."
        : `Download failed (${res.status})`,
    );
  }
  const blob = await res.blob();
  return { blob, name: filenameFromDisposition(res.headers.get("Content-Disposition")) };
}

/**
 * Saves an already-fetched Blob to the user's device under `name`. On iOS the
 * native share sheet is used (the <a download> path silently opens the file
 * inline instead of saving it); everywhere else a temporary object-URL anchor.
 */
export async function downloadBlob(blob: Blob, name: string): Promise<void> {
  // iOS: open the native share sheet so the user can "Save to Files"/Photos.
  if (isIOS() && typeof navigator !== "undefined") {
    const file = new File([blob], name, {
      type: blob.type || "application/octet-stream",
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return;
      } catch (err) {
        // The user dismissing the share sheet is not a failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Anything else (e.g. activation expired) falls through to the anchor
        // download as a best-effort last resort.
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/**
 * Download the file at `url` to the user's device. Resolves once the download
 * has been triggered; rejects if the request fails (e.g. the converted file is
 * no longer available on the server).
 *
 * @param url           Same-origin URL of the file (e.g. `/api/download/123`).
 * @param fallbackName  Filename to use if the server sends no Content-Disposition.
 */
export async function downloadFromUrl(
  url: string,
  fallbackName?: string,
): Promise<void> {
  const { blob, name } = await fetchFileBlob(url);
  const finalName =
    fallbackName || name || url.split("/").pop() || "download";
  await downloadBlob(blob, finalName);
}
