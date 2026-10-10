import { useCallback, useEffect, useRef, useState } from "react";
import { getTranslateEducationPdfUrl } from "@workspace/api-client-react";
import { TranslateEducationPdfResponse } from "@workspace/api-zod";
import type { EducationSourcePage, EducationTranslatedPage, EducationTranslation, EducationTranslationEvent, EducationTranslationInput, EducationTranslationReceipt } from "@workspace/api-client-react";
import { educationHeaders } from "./requests";
import { describeError } from "./errors";

export type TranslateStatus = "idle" | "running" | "partial" | "error" | "done";
export interface TranslateSettings { direction: EducationTranslationInput["direction"]; keepTechnicalEnglish: boolean }

/**
 * Streams per-page translation. Receipts, source pages and requestId live in memory only.
 * Retries resend the same pages, settings and requestId plus every successful receipt.
 */
export function useTranslationStream(onDone: (t: EducationTranslation) => void) {
  const [status, setStatus] = useState<TranslateStatus>("idle");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [translated, setTranslated] = useState<Record<number, EducationTranslatedPage>>({});
  const [failed, setFailed] = useState<Record<number, string>>({});
  const [retrying, setRetrying] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<EducationTranslation | null>(null);
  const [source, setSource] = useState<EducationSourcePage[]>([]);
  const receipts = useRef(new Map<number, EducationTranslationReceipt>());
  const job = useRef<{ pages: EducationSourcePage[]; settings: TranslateSettings; requestId: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const running = useRef(false);
  const doneRef = useRef(onDone); doneRef.current = onDone;

  const stream = useCallback(async (retryPage?: number) => {
    const j = job.current;
    if (!j || running.current) return;
    running.current = true;
    const ctl = new AbortController(); abort.current = ctl;
    setStatus("running"); setMessage(null); setRetrying(retryPage ?? null);
    if (retryPage !== undefined) setFailed((f) => { const n = { ...f }; delete n[retryPage]; return n; });
    const body: EducationTranslationInput = {
      pages: j.pages, direction: j.settings.direction, keepTechnicalEnglish: j.settings.keepTechnicalEnglish, requestId: j.requestId,
      completed: Array.from(receipts.current.values()),
      ...(retryPage !== undefined ? { retryPages: [retryPage] } : {}),
    };
    let ended = false;
    const handle = (ev: EducationTranslationEvent) => {
      if (job.current !== j || ctl.signal.aborted) return;
      if (ev.type === "progress") setProgress((p) => ({ completed: ev.completed ?? p.completed, total: ev.total ?? p.total }));
      else if (ev.type === "page" && ev.receipt) {
        const r = ev.receipt; receipts.current.set(r.page.pageNumber, r);
        setTranslated((t) => ({ ...t, [r.page.pageNumber]: r.page }));
        setFailed((f) => { const n = { ...f }; delete n[r.page.pageNumber]; return n; });
        setProgress((p) => ({ total: ev.total ?? p.total, completed: ev.completed ?? receipts.current.size }));
      } else if (ev.type === "page-error" && ev.pageNumber !== undefined) {
        setFailed((f) => ({ ...f, [ev.pageNumber!]: ev.message || "This page could not be translated." }));
      } else if (ev.type === "partial") { ended = true; setStatus("partial"); setMessage(ev.message || "Some pages failed. Retry them individually. Nothing is charged until the whole document is translated."); }
      else if (ev.type === "complete" && ev.result) {
        ended = true; setResult(ev.result); setStatus("done");
        setTranslated(Object.fromEntries(ev.result.pages.map((p) => [p.pageNumber, p])));
        setFailed({}); doneRef.current(ev.result);
      } else if (ev.type === "error") { ended = true; setStatus("error"); setMessage(ev.message || "Translation failed. Try again."); }
    };
    try {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${base}${getTranslateEducationPdfUrl()}`, {
        method: "POST", credentials: "include", signal: ctl.signal,
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", ...educationHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        let msg = ""; try { msg = (await res.json())?.error ?? ""; } catch { /* non-JSON */ }
        throw Object.assign(new Error(msg || `Translation failed (${res.status}).`), { status: res.status, data: msg ? { error: msg } : null });
      }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      const flush = (line: string) => {
        const text = line.trim(); if (!text) return;
        const event = TranslateEducationPdfResponse.safeParse(JSON.parse(text));
        if (!event.success) throw new Error("The translation stream returned invalid progress data. Retry to resume completed pages.");
        handle(event.data);
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        lines.forEach(flush);
      }
      buf += dec.decode(); flush(buf);
      if (!ended && job.current === j && !ctl.signal.aborted) { setStatus("error"); setMessage("The connection ended early. Pages already translated are kept. Retry to continue."); }
    } catch (e) {
      if (!ctl.signal.aborted) { setStatus("error"); setMessage(describeError(e)); }
    } finally {
      if (abort.current === ctl) { running.current = false; setRetrying(null); abort.current = null; }
    }
  }, []);

  const start = useCallback((pages: EducationSourcePage[], settings: TranslateSettings) => {
    receipts.current = new Map(); setTranslated({}); setFailed({}); setResult(null);
    setSource(pages); setProgress({ completed: 0, total: pages.length });
    job.current = { pages, settings, requestId: crypto.randomUUID() };
    return stream();
  }, [stream]);

  const reset = useCallback(() => {
    abort.current?.abort(); abort.current = null; running.current = false;
    receipts.current = new Map(); job.current = null;
    setStatus("idle"); setProgress({ completed: 0, total: 0 }); setTranslated({}); setFailed({}); setResult(null); setSource([]); setMessage(null); setRetrying(null);
  }, []);
  useEffect(() => () => { abort.current?.abort(); }, []);

  const showResult = useCallback((t: EducationTranslation) => { reset(); setResult(t); setStatus("done"); setTranslated(Object.fromEntries(t.pages.map((p) => [p.pageNumber, p]))); setProgress({ completed: t.pages.length, total: t.pages.length }); }, [reset]);

  return { status, progress, translated, failed, retrying, message, result, source, start, retryPage: (n: number) => stream(n), resume: () => stream(), reset, showResult, locked: job.current !== null && status !== "done" };
}
