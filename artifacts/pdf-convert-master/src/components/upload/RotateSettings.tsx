import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadPdfDocument } from "@/lib/pdfClient";
import { OptionGroup, SettingsPanel, TextInput } from "./OptionControls";
import { PdfPageStatus } from "./PdfPageStatus";
import { pagesToRangeString, parsePageRanges } from "./pageRanges";
import { usePdfInfo } from "./usePdfDocument";

export type RotateAngle = 90 | 180 | 270;
export type RotateScope = "all" | "selected";

const CACHE_MAX = 120;

interface Thumb { url: string; ratio: number }

type PdfDoc = Awaited<ReturnType<typeof loadPdfDocument>>;

/**
 * Lazy thumbnails for every page. Pages render only when requested (visible),
 * strictly one at a time, with a bounded cache; evicted pages re-render when
 * they scroll back into view. Everything is cancelled when the file changes.
 */
function useThumbnails(file: File | undefined, pageCount: number | null) {
  const [thumbs, setThumbs] = useState<Record<number, Thumb>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const api = useRef<{ request: (p: number) => void; visible: (p: number, v: boolean) => void }>({
    request: () => undefined,
    visible: () => undefined,
  });

  useEffect(() => {
    setThumbs({}); setFailed(null);
    if (!file || !pageCount) return;
    let cancelled = false;
    let doc: PdfDoc | null = null;
    let loading: Promise<PdfDoc> | null = null;
    const cache = new Map<number, Thumb>();
    const queue: number[] = [];
    const queued = new Set<number>();
    const visible = new Set<number>();
    let running = false;

    const getDoc = () => {
      if (!loading) {
        loading = (async () => {
          const bytes = new Uint8Array(await file.arrayBuffer());
          return loadPdfDocument(bytes);
        })();
      }
      return loading;
    };
    const publish = () => { if (!cancelled) setThumbs(Object.fromEntries(cache)); };

    const run = async () => {
      if (running) return;
      running = true;
      try {
        while (queue.length && !cancelled) {
          // Newest request first: what the user just scrolled to.
          const p = queue.pop()!;
          queued.delete(p);
          if (cache.has(p) || !visible.has(p)) continue;
          doc = await getDoc();
          if (cancelled) break;
          const page = await doc.getPage(p);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: 160 / Math.max(base.width, base.height) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
          const t: Thumb = { url: canvas.toDataURL("image/jpeg", 0.7), ratio: vp.width / vp.height };
          canvas.width = 0; canvas.height = 0;
          page.cleanup();
          cache.set(p, t);
          for (const k of cache.keys()) {
            if (cache.size <= CACHE_MAX) break;
            if (!visible.has(k)) cache.delete(k);
          }
          publish();
        }
      } catch (e) {
        if (!cancelled) setFailed(e instanceof Error ? e.message : "Preview failed");
      } finally {
        running = false;
      }
    };

    api.current = {
      request: (p) => {
        if (cancelled || cache.has(p) || queued.has(p)) return;
        queued.add(p); queue.push(p);
        void run();
      },
      visible: (p, v) => { if (v) visible.add(p); else visible.delete(p); },
    };

    return () => {
      cancelled = true;
      api.current = { request: () => undefined, visible: () => undefined };
      queue.length = 0; cache.clear();
      const l = loading as Promise<PdfDoc> | null;
      if (l) void l.then((d) => d.loadingTask.destroy()).catch(() => undefined);
    };
  }, [file, pageCount]);

  return { thumbs, failed, api };
}

const LazyItem: React.FC<{
  page: number;
  api: React.MutableRefObject<{ request: (p: number) => void; visible: (p: number, v: boolean) => void }>;
  children: React.ReactNode;
}> = ({ page, api, children }) => {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      api.current.visible(page, true); api.current.request(page);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        api.current.visible(page, en.isIntersecting);
        if (en.isIntersecting) api.current.request(page);
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { io.disconnect(); api.current.visible(page, false); };
  }, [page, api]);
  return <li ref={ref}>{children}</li>;
};

export const RotateSettings: React.FC<{
  file: File | undefined;
  angle: RotateAngle;
  scope: RotateScope;
  selected: number[];
  onAngle: (a: RotateAngle) => void;
  onScope: (s: RotateScope) => void;
  onSelected: (p: number[]) => void;
  onValidChange: (ok: boolean) => void;
  disabled?: boolean;
}> = ({ file, angle, scope, selected, onAngle, onScope, onSelected, onValidChange, disabled }) => {
  const info = usePdfInfo(file);
  const count = info.status === "ready" ? info.pageCount : null;
  const { thumbs, failed, api: thumbApi } = useThumbnails(file, count);
  const [text, setText] = useState("");
  const sel = useMemo(() => new Set(selected), [selected]);
  const parsed = parsePageRanges(text, count);
  const ok = info.status === "ready" && (scope === "all" || selected.length > 0);
  const cb = useRef(onValidChange);
  cb.current = onValidChange;
  useEffect(() => { cb.current(ok); }, [ok]);

  const setFromText = (v: string) => {
    setText(v);
    const p = parsePageRanges(v, count);
    onSelected(p.ok ? p.pages : []);
  };
  const toggle = (p: number) => {
    const next = sel.has(p) ? selected.filter((x) => x !== p) : [...selected, p];
    onSelected(next);
    setText(pagesToRangeString(next));
  };
  const pages = count ? Array.from({ length: count }, (_, i) => i + 1) : [];
  const allCount = count ?? 0;

  return (
    <SettingsPanel title="Rotation">
      <PdfPageStatus info={info} />
      <OptionGroup
        label="Pages to rotate" value={scope} disabled={disabled} testIdPrefix="select-rotate-scope" onChange={onScope}
        options={[{ value: "all", label: "All pages" }, { value: "selected", label: "Selected pages" }]}
      />
      <OptionGroup
        label="Rotate clockwise by" value={angle} disabled={disabled} testIdPrefix="select-rotate-angle" onChange={onAngle}
        options={[{ value: 90, label: "90" }, { value: 180, label: "180" }, { value: 270, label: "270" }]}
      />
      <p className="text-xs text-gray-600">The angle is added to each page's existing rotation. Unselected pages stay as they are.</p>

      {scope === "selected" && info.status === "ready" && (
        <div className="space-y-2">
          <label htmlFor="input-rotate-pages" className="block text-sm font-medium text-gray-900">Pages (type or click thumbnails)</label>
          <TextInput
            id="input-rotate-pages" value={text} disabled={disabled} placeholder="1-3,5" autoComplete="off"
            onChange={(e) => setFromText(e.target.value)} aria-invalid={!!text && !parsed.ok} data-testid="input-rotate-pages"
          />
          <p className={`text-xs ${text && !parsed.ok ? "text-red-600" : "text-gray-500"}`} role={text && !parsed.ok ? "alert" : undefined}>
            {text && !parsed.ok ? parsed.error : `${selected.length} of ${allCount} selected.`}
          </p>
          <div className="flex gap-3 text-xs">
            <button type="button" className="text-[#c8312c] underline" onClick={() => { onSelected(pages); setText(pagesToRangeString(pages)); }} data-testid="button-select-all-pages">Select all</button>
            <button type="button" className="text-[#c8312c] underline" onClick={() => { onSelected([]); setText(""); }} data-testid="button-clear-pages">Clear</button>
          </div>
        </div>
      )}

      {info.status === "ready" && (
        <>
          <ul className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5" aria-label="PDF pages" data-testid="rotate-thumbnails">
            {pages.map((p) => {
              const on = scope === "all" || sel.has(p);
              const t = thumbs[p];
              const deg = on ? angle : 0;
              const w = t ? (t.ratio >= 1 ? 100 : t.ratio * 100) : 70;
              const h = t ? (t.ratio >= 1 ? 100 / t.ratio : 100) : 100;
              return (
                <LazyItem key={p} page={p} api={thumbApi}>
                  <button
                    type="button" disabled={disabled || scope === "all"} onClick={() => toggle(p)}
                    aria-pressed={scope === "all" ? true : on}
                    aria-label={`Page ${p}${on ? `, will rotate ${angle} degrees` : ", not rotated"}`}
                    data-testid={`rotate-thumb-${p}`} data-selected={on ? "true" : "false"}
                    className={`w-full rounded-lg border-2 bg-white p-1.5 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7433d]/40 ${on ? "border-[#f7433d]" : "border-gray-200"} ${scope === "all" ? "cursor-default" : "hover:border-[#f7433d]/60"}`}
                  >
                    <span className="relative block aspect-square w-full overflow-hidden">
                      {t ? (
                        <span className="absolute left-1/2 top-1/2 block transition-transform duration-300 motion-reduce:transition-none" style={{ width: `${w}%`, height: `${h}%`, transform: `translate(-50%,-50%) rotate(${deg}deg)` }}>
                          <img src={t.url} alt="" className="h-full w-full object-contain shadow-sm" draggable={false} />
                        </span>
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-gray-400">
                          {!failed ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-[10px]">No preview</span>}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-gray-700">Page {p}</span>
                  </button>
                </LazyItem>
              );
            })}
          </ul>
          {failed && <p className="text-xs text-red-600" role="alert">A preview could not be drawn ({failed}). You can still select pages by number.</p>}
        </>
      )}
    </SettingsPanel>
  );
};
