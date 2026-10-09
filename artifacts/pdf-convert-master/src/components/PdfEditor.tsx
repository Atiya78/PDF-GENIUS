import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PDFDocument,
  rgb,
  StandardFonts,
  LineCapStyle,
  PDFName,
  PDFString,
} from "pdf-lib";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { usePlanMaxFileMB, effectiveMaxMB } from "@/lib/usePlanUploadLimit";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { PdfDropzone } from "@/components/pdf-tools/PdfToolShell";
import { toolConfigs } from "@/lib/toolConfig";
import { ManagePagesModal } from "@/components/pdf-tools/ManagePagesModal";
import {
  readFileBytes,
  renderPdfPages,
  downloadPdf,
  stripExt,
  isPdfFile,
  fileToDataUrl,
  loadImageElement,
  dataUrlToBytes,
  hexToRgb01,
  type RenderedPage,
} from "@/lib/pdfClient";
import {
  extractPageTexts,
  sampleTextColors,
  type PageTextItem,
} from "@/lib/pdfText";
import {
  MousePointer2,
  Type,
  TextCursorInput,
  Image as ImageIcon,
  PenTool,
  Pencil,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Hexagon,
  Link2,
  Highlighter,
  Eraser,
  Stamp as StampIcon,
  StickyNote,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  Trash2,
  Copy,
  PanelLeft,
  X,
  ChevronDown,
  Check,
  Search as SearchIcon,
  Files,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// All geometry is stored in PDF user-space points with a TOP-LEFT origin so it
// stays correct at any zoom. We flip the Y axis only when exporting because
// pdf-lib's origin is bottom-left.
type Tool =
  | "select"
  | "text"
  | "image"
  | "signature"
  | "draw"
  | "line"
  | "arrow"
  | "rect"
  | "ellipse"
  | "polygon"
  | "highlight"
  | "whiteout"
  | "stamp"
  | "note"
  | "link";

type FontFamily = "Helvetica" | "Times" | "Courier";

interface Base {
  id: string;
  pageIndex: number;
}
interface TextEl extends Base {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  family: FontFamily;
  bold: boolean;
  italic: boolean;
}
interface ImageEl extends Base {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  bytes: Uint8Array;
  format: "png" | "jpg";
}
interface ShapeEl extends Base {
  type: "rect" | "highlight" | "whiteout" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
}
interface LineEl extends Base {
  type: "line";
  variant: "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}
interface PolygonEl extends Base {
  type: "polygon";
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}
interface LinkEl extends Base {
  type: "link";
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
}
interface DrawEl extends Base {
  type: "draw";
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}
interface StampEl extends Base {
  type: "stamp";
  x: number;
  y: number;
  label: string;
  color: string;
  fontSize: number;
}
interface NoteEl extends Base {
  type: "note";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}
type EditElement =
  | TextEl
  | ImageEl
  | ShapeEl
  | LineEl
  | PolygonEl
  | LinkEl
  | DrawEl
  | StampEl
  | NoteEl;

const CSS_FONT: Record<FontFamily, string> = {
  Helvetica: "Helvetica, Arial, sans-serif",
  Times: "'Times New Roman', Times, serif",
  Courier: "'Courier New', Courier, monospace",
};

function stdFont(family: FontFamily, bold: boolean, italic: boolean): StandardFonts {
  if (family === "Times") {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold) return StandardFonts.TimesRomanBold;
    if (italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (family === "Courier") {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

// pdf-lib's StandardFonts use WinAnsi encoding; normalise common typographic
// characters and drop anything outside Latin-1 so a stray glyph can't abort the
// whole export.
function sanitize(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

const STAMP_PRESETS: { label: string; color: string }[] = [
  { label: "APPROVED", color: "#16a34a" },
  { label: "CONFIDENTIAL", color: "#dc2626" },
  { label: "DRAFT", color: "#6b7280" },
  { label: "REVIEWED", color: "#f7433d" },
  { label: "FINAL", color: "#7c3aed" },
  { label: "PAID", color: "#0891b2" },
];

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(v, hi));

type DragState =
  | {
      mode: "move";
      id: string;
      pageIndex: number;
      lastX: number;
      lastY: number;
      moved: boolean;
    }
  | {
      mode: "resize";
      id: string;
      pageIndex: number;
      corner: "nw" | "ne" | "sw" | "se";
      startX: number;
      startY: number;
      orig: { x: number; y: number; width: number; height: number };
      aspect: number | null;
      moved: boolean;
    }
  | {
      mode: "endpoint";
      id: string;
      pageIndex: number;
      which: "p1" | "p2";
      moved: boolean;
    };

// Inline, on-page text editor: a contentEditable rendered EXACTLY over a text
// element so the user types directly on the PDF page (blinking caret in place)
// instead of in a side panel. Its text is set ONCE on mount and is not React-
// controlled afterwards, so parent re-renders never reset the caret position.
const InlineTextEditor: React.FC<{
  initial: string;
  style: React.CSSProperties;
  onChange: (text: string) => void;
  onCommit: () => void;
  testId?: string;
}> = ({ initial, style, onChange, onCommit, testId }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.textContent = initial;
    node.focus();
    // Place a plain blinking caret at the end of the run (no selection
    // highlight). Selecting the whole run would paint the browser's blue
    // ::selection band; the user wants a clean caret only.
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label="Edit PDF text"
      data-testid={testId}
      className="pdf-inline-edit"
      style={style}
      onInput={(e) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={(e) => {
        if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
          e.preventDefault();
          onCommit();
        }
        e.stopPropagation();
      }}
      onBlur={onCommit}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
};

export const PdfEditor: React.FC = () => {
  const { toast } = useToast();
  const planMaxMB = usePlanMaxFileMB();
  const [file, setFile] = useState<File | null>(null);
  const [srcBytes, setSrcBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [elements, setElements] = useState<EditElement[]>([]);
  const [past, setPast] = useState<EditElement[][]>([]);
  const [future, setFuture] = useState<EditElement[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Id of the text element being typed into inline (blinking caret) on the page.
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  // Tracks the last pointerdown on a text run so we can detect a double-tap in
  // onPointerDown itself. (onDoubleClick is unreliable here: the first click's
  // setPointerCapture retargets the synthesized click/dblclick to the page.)
  const lastTextTapRef = useRef<{ id: string; t: number }>({ id: "", t: 0 });
  const [tool, setTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState(1);
  const [activePage, setActivePage] = useState(0);
  const [showThumbs, setShowThumbs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);

  // text engine (shared by Edit-text + Search), lazily populated
  const [textByPage, setTextByPage] = useState<PageTextItem[][] | null>(null);
  const [textBusy, setTextBusy] = useState(false);

  // search
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<
    { pageIndex: number; x: number; y: number; width: number; height: number }[]
  >([]);
  const [matchIdx, setMatchIdx] = useState(0);
  const searchSeqRef = useRef(0);
  const textPromiseRef = useRef<Promise<PageTextItem[][]> | null>(null);

  // manage pages
  const [manageOpen, setManageOpen] = useState(false);

  // line/shape dropdown
  const [lineMenuOpen, setLineMenuOpen] = useState(false);

  // in-progress polygon (multi-click); rubber-band tip tracked separately
  const [poly, setPoly] = useState<{
    pageIndex: number;
    points: { x: number; y: number }[];
  } | null>(null);
  const [polyTip, setPolyTip] = useState<{ x: number; y: number } | null>(null);

  const [draft, setDraft] = useState({
    color: "#e02d27",
    strokeWidth: 3,
    family: "Helvetica" as FontFamily,
    fontSize: 18,
    bold: false,
    italic: false,
    highlightColor: "#fde047",
    stampLabel: "APPROVED",
    stampColor: "#16a34a",
    linkUrl: "https://",
  });

  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const polyRef = useRef(poly);
  polyRef.current = poly;
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  // Guards "Edit text" against overlapping runs (double-clicks) which could each
  // compute their own `fresh` set before the other's setElements lands.
  const editingWholePageRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const creatingRef = useRef<{
    id: string;
    pageIndex: number;
    startX: number;
    startY: number;
    type: Tool;
  } | null>(null);
  const snapshotRef = useRef<EditElement[] | null>(null);
  const editSessionRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const padDrawing = useRef(false);
  const padInk = useRef(false);

  // --- history ---------------------------------------------------------------
  const pushHistory = (snapshot: EditElement[]) => {
    setPast((p) => [...p.slice(-49), snapshot]);
    setFuture([]);
    editSessionRef.current = null;
  };
  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture((f) => [elementsRef.current, ...f]);
    setPast(past.slice(0, -1));
    setElements(prev);
    setSelectedId(null);
    setEditingTextId(null);
    editSessionRef.current = null;
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setPast((p) => [...p, elementsRef.current]);
    setFuture(future.slice(1));
    setElements(next);
    setSelectedId(null);
    setEditingTextId(null);
    editSessionRef.current = null;
  };

  // --- load ------------------------------------------------------------------
  const loadPdf = useCallback(
    async (f: File) => {
      if (!isPdfFile(f)) {
        toast({ title: "Please choose a PDF file", variant: "destructive" });
        return;
      }
      const capMB = effectiveMaxMB(100, planMaxMB);
      if (f.size > capMB * 1024 * 1024) {
        toast({ title: "File too large", description: `Maximum file size is ${capMB}MB for your plan.`, variant: "destructive" });
        return;
      }
      setLoading(true);
      try {
        const b = await readFileBytes(f);
        // Render in the PDF's UNROTATED user space so on-screen geometry lines
        // up with pdf-lib export coordinates (which ignore /Rotate). The saved
        // page keeps its /Rotate, so annotations rotate together with content.
        const rendered = await renderPdfPages(b, undefined, undefined, {
          forceUnrotated: true,
        });
        setSrcBytes(b);
        setPages(rendered);
        setElements([]);
        setPast([]);
        setFuture([]);
        setSelectedId(null);
        setEditingTextId(null);
        setActivePage(0);
        {
          // Fit narrow viewports (no thumbnail rail below md) so the page starts
          // centred and fully visible; users can still zoom freely afterwards.
          const widest = Math.max(...rendered.map((r) => r.width), 1);
          const avail = window.innerWidth < 768 ? window.innerWidth - 32 : Infinity;
          setZoom(clamp(+Math.min(1, avail / widest).toFixed(2), 0.4, 3));
        }
        setFile(f);
        creatingRef.current = null;
        dragRef.current = null;
        snapshotRef.current = null;
        editSessionRef.current = null;
        textPromiseRef.current = null;
        setTextByPage(null);
        setSearchOpen(false);
        setQuery("");
        setMatches([]);
        setMatchIdx(0);
        setManageOpen(false);
        setPoly(null);
        setPolyTip(null);
        setTool("select");
        if (rendered.some((p) => p.rotation)) {
          toast({
            title: "Rotated pages detected",
            description:
              "Rotated pages are shown in their native orientation. Your edits are saved aligned to the page content.",
          });
        }
      } catch (err) {
        console.error(err);
        toast({
          title: "Could not open PDF",
          description: "The file may be corrupt or password-protected.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, planMaxMB],
  );

  // Apply a page-plan from the Manage Pages modal: swap in the rebuilt PDF,
  // re-render, and remap element page indices (dropping elements on pages that
  // were deleted). `pageMap` maps an OLD page index -> its NEW index.
  const applyPageChanges = useCallback(
    async (result: { bytes: Uint8Array; pageMap: Record<number, number> }) => {
      const { bytes, pageMap } = result;
      setLoading(true);
      try {
        const rendered = await renderPdfPages(bytes, undefined, undefined, {
          forceUnrotated: true,
        });
        setSrcBytes(bytes);
        setPages(rendered);
        setElements((prev) =>
          prev
            .filter((el) => pageMap[el.pageIndex] !== undefined)
            .map((el) => ({ ...el, pageIndex: pageMap[el.pageIndex] })),
        );
        setPast([]);
        setFuture([]);
        setSelectedId(null);
        setEditingTextId(null);
        textPromiseRef.current = null;
        setTextByPage(null);
        setSearchOpen(false);
        setQuery("");
        setMatches([]);
        setMatchIdx(0);
        setPoly(null);
        setPolyTip(null);
        setTool("select");
        setActivePage(0);
        setManageOpen(false);
      } catch (err) {
        console.error(err);
        toast({
          title: "Could not update pages",
          description: "Something went wrong rebuilding the document.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // --- geometry helpers ------------------------------------------------------
  const pageById = (i: number) => pages.find((p) => p.pageIndex === i)!;
  const toPoint = (e: { clientX: number; clientY: number }, pageIndex: number) => {
    const el = pageRefs.current[pageIndex];
    const page = pageById(pageIndex);
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const s = page.width / rect.width;
    return {
      x: clamp((e.clientX - rect.left) * s, 0, page.width),
      y: clamp((e.clientY - rect.top) * s, 0, page.height),
    };
  };

  const updateEl = (id: string, patch: Partial<EditElement>) =>
    setElements((prev) =>
      prev.map((el) => (el.id === id ? ({ ...el, ...patch } as EditElement) : el)),
    );

  // Property/content edits to the SELECTED element. Edits that fire rapidly
  // (typing, dragging a colour/size control) are coalesced into ONE undo step
  // per (element, field) "session"; any other history action or undo/redo
  // (which reset editSessionRef) starts a fresh step. This is the single path
  // that records history for property edits AND clears the redo stack.
  const propEdit = (sessionKey: string, id: string, patch: Partial<EditElement>) => {
    if (editSessionRef.current !== sessionKey) {
      pushHistory(elementsRef.current);
      editSessionRef.current = sessionKey;
    }
    updateEl(id, patch);
  };
  // Discrete one-shot edits (toggles, dropdown picks): each is its own step.
  const discreteEdit = (id: string, patch: Partial<EditElement>) => {
    pushHistory(elementsRef.current);
    updateEl(id, patch);
  };

  const boundsOf = (el: EditElement) => {
    if (el.type === "line")
      return {
        x: Math.min(el.x1, el.x2),
        y: Math.min(el.y1, el.y2),
        width: Math.abs(el.x2 - el.x1),
        height: Math.abs(el.y2 - el.y1),
      };
    if (el.type === "draw" || el.type === "polygon") {
      const xs = el.points.map((p) => p.x);
      const ys = el.points.map((p) => p.y);
      const x = Math.min(...xs),
        y = Math.min(...ys);
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    }
    if (el.type === "text" || el.type === "stamp")
      return { x: el.x, y: el.y, width: 0, height: 0 };
    return { x: el.x, y: el.y, width: el.width, height: el.height };
  };

  // --- create / add ----------------------------------------------------------
  const addImageFromDataUrl = async (
    dataUrl: string,
    bytes: Uint8Array,
    format: "png" | "jpg",
    aspect: number,
  ) => {
    const page = pageById(activePage);
    const w = Math.min(page.width * 0.4, 220);
    pushHistory(elementsRef.current);
    const el: ImageEl = {
      id: genId(),
      type: "image",
      pageIndex: activePage,
      x: (page.width - w) / 2,
      y: (page.height - w * aspect) / 2,
      width: w,
      height: w * aspect,
      dataUrl,
      bytes,
      format,
    };
    setElements((p) => [...p, el]);
    setSelectedId(el.id);
    setTool("select");
  };

  const onImagePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const isPng = f.type === "image/png";
    const isJpg = f.type === "image/jpeg";
    if (!isPng && !isJpg) {
      toast({ title: "Use a PNG or JPG image", variant: "destructive" });
      return;
    }
    const url = await fileToDataUrl(f);
    const img = await loadImageElement(url);
    await addImageFromDataUrl(
      url,
      await readFileBytes(f),
      isPng ? "png" : "jpg",
      img.naturalHeight / img.naturalWidth || 1,
    );
  };

  // --- signature pad ---------------------------------------------------------
  const padPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = padRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };
  const padDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = padRef.current!.getContext("2d")!;
    padDrawing.current = true;
    const { x, y } = padPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const padMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!padDrawing.current) return;
    const ctx = padRef.current!.getContext("2d")!;
    const { x, y } = padPos(e);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(x, y);
    ctx.stroke();
    padInk.current = true;
  };
  const padUp = () => {
    padDrawing.current = false;
  };
  const padClear = () => {
    const c = padRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    padInk.current = false;
  };
  const useSignature = async () => {
    const c = padRef.current;
    if (!c || !padInk.current) {
      toast({ title: "Draw your signature first", variant: "destructive" });
      return;
    }
    const url = c.toDataURL("image/png");
    setSigOpen(false);
    padClear();
    await addImageFromDataUrl(url, dataUrlToBytes(url), "png", c.height / c.width);
  };

  // --- pointer interactions --------------------------------------------------
  const onElementPointerDown = (e: React.PointerEvent, el: EditElement) => {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(el.id);
    setActivePage(el.pageIndex);
    pageRefs.current[el.pageIndex]?.setPointerCapture(e.pointerId);
    snapshotRef.current = elementsRef.current;
    const p = toPoint(e, el.pageIndex);
    dragRef.current = {
      mode: "move",
      id: el.id,
      pageIndex: el.pageIndex,
      lastX: p.x,
      lastY: p.y,
      moved: false,
    };
  };

  const onResizeDown = (
    e: React.PointerEvent,
    el: EditElement,
    corner: "nw" | "ne" | "sw" | "se",
  ) => {
    e.stopPropagation();
    setSelectedId(el.id);
    pageRefs.current[el.pageIndex]?.setPointerCapture(e.pointerId);
    snapshotRef.current = elementsRef.current;
    const p = toPoint(e, el.pageIndex);
    const b = boundsOf(el);
    dragRef.current = {
      mode: "resize",
      id: el.id,
      pageIndex: el.pageIndex,
      corner,
      startX: p.x,
      startY: p.y,
      orig: { x: b.x, y: b.y, width: b.width, height: b.height },
      aspect: el.type === "image" ? b.height / b.width : null,
      moved: false,
    };
  };

  const onEndpointDown = (
    e: React.PointerEvent,
    el: LineEl,
    which: "p1" | "p2",
  ) => {
    e.stopPropagation();
    setSelectedId(el.id);
    pageRefs.current[el.pageIndex]?.setPointerCapture(e.pointerId);
    snapshotRef.current = elementsRef.current;
    dragRef.current = {
      mode: "endpoint",
      id: el.id,
      pageIndex: el.pageIndex,
      which,
      moved: false,
    };
  };

  const onPageDown = (e: React.PointerEvent, page: RenderedPage) => {
    setActivePage(page.pageIndex);
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    const p = toPoint(e, page.pageIndex);
    pageRefs.current[page.pageIndex]?.setPointerCapture(e.pointerId);
    snapshotRef.current = elementsRef.current;

    if (tool === "polygon") {
      if (!poly || poly.pageIndex !== page.pageIndex) {
        setPoly({ pageIndex: page.pageIndex, points: [{ x: p.x, y: p.y }] });
        setPolyTip({ x: p.x, y: p.y });
      } else {
        const first = poly.points[0];
        const closing =
          poly.points.length >= 3 &&
          Math.hypot(first.x - p.x, first.y - p.y) < 12;
        if (closing) finalizePolygon();
        else setPoly({ ...poly, points: [...poly.points, { x: p.x, y: p.y }] });
      }
      return;
    }

    if (tool === "text") {
      // Prevent the mousedown focus default from blurring the inline editor
      // that auto-opens for the new text element.
      e.preventDefault();
      pushHistory(elementsRef.current);
      const el: TextEl = {
        id: genId(),
        type: "text",
        pageIndex: page.pageIndex,
        x: p.x,
        y: p.y,
        text: "New text",
        fontSize: draft.fontSize,
        color: draft.color,
        family: draft.family,
        bold: draft.bold,
        italic: draft.italic,
      };
      setElements((prev) => [...prev, el]);
      setSelectedId(el.id);
      setEditingTextId(el.id);
      setTool("select");
      return;
    }
    if (tool === "stamp") {
      pushHistory(elementsRef.current);
      const el: StampEl = {
        id: genId(),
        type: "stamp",
        pageIndex: page.pageIndex,
        x: p.x,
        y: p.y,
        label: draft.stampLabel,
        color: draft.stampColor,
        fontSize: 22,
      };
      setElements((prev) => [...prev, el]);
      setSelectedId(el.id);
      setTool("select");
      return;
    }

    const id = genId();
    creatingRef.current = {
      id,
      pageIndex: page.pageIndex,
      startX: p.x,
      startY: p.y,
      type: tool,
    };
    let el: EditElement;
    if (tool === "line" || tool === "arrow") {
      el = {
        id,
        type: "line",
        variant: tool === "arrow" ? "arrow" : "line",
        pageIndex: page.pageIndex,
        x1: p.x,
        y1: p.y,
        x2: p.x,
        y2: p.y,
        color: draft.color,
        strokeWidth: draft.strokeWidth,
      };
    } else if (tool === "draw") {
      el = {
        id,
        type: "draw",
        pageIndex: page.pageIndex,
        points: [{ x: p.x, y: p.y }],
        color: draft.color,
        strokeWidth: draft.strokeWidth,
      };
    } else if (tool === "note") {
      el = {
        id,
        type: "note",
        pageIndex: page.pageIndex,
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        text: "Note",
      };
    } else if (tool === "link") {
      el = {
        id,
        type: "link",
        pageIndex: page.pageIndex,
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        url: draft.linkUrl,
      };
    } else {
      el = {
        id,
        type: tool as "rect" | "highlight" | "whiteout" | "ellipse",
        pageIndex: page.pageIndex,
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        color: tool === "highlight" ? draft.highlightColor : draft.color,
        strokeWidth: draft.strokeWidth,
      };
    }
    setElements((prev) => [...prev, el]);
    setSelectedId(id);
  };

  const onPageMove = (e: React.PointerEvent, page: RenderedPage) => {
    const p = toPoint(e, page.pageIndex);
    const c = creatingRef.current;
    if (tool === "polygon" && poly && poly.pageIndex === page.pageIndex) {
      setPolyTip({ x: p.x, y: p.y });
      return;
    }
    if (c) {
      if (c.type === "line" || c.type === "arrow") {
        updateEl(c.id, { x2: p.x, y2: p.y } as Partial<LineEl>);
      } else if (c.type === "draw") {
        setElements((prev) =>
          prev.map((el) =>
            el.id === c.id && el.type === "draw"
              ? { ...el, points: [...el.points, { x: p.x, y: p.y }] }
              : el,
          ),
        );
      } else {
        const x = Math.min(c.startX, p.x);
        const y = Math.min(c.startY, p.y);
        updateEl(c.id, {
          x,
          y,
          width: Math.abs(p.x - c.startX),
          height: Math.abs(p.y - c.startY),
        } as Partial<ShapeEl>);
      }
      return;
    }

    const d = dragRef.current;
    if (!d) return;
    if (!d.moved) {
      d.moved = true;
      pushHistory(snapshotRef.current ?? elementsRef.current);
    }

    if (d.mode === "move") {
      const dx = p.x - d.lastX;
      const dy = p.y - d.lastY;
      d.lastX = p.x;
      d.lastY = p.y;
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== d.id) return el;
          if (el.type === "line")
            return {
              ...el,
              x1: el.x1 + dx,
              y1: el.y1 + dy,
              x2: el.x2 + dx,
              y2: el.y2 + dy,
            };
          if (el.type === "draw" || el.type === "polygon")
            return {
              ...el,
              points: el.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
            };
          return {
            ...el,
            x: clamp(el.x + dx, 0, page.width),
            y: clamp(el.y + dy, 0, page.height),
          } as EditElement;
        }),
      );
    } else if (d.mode === "endpoint") {
      updateEl(
        d.id,
        (d.which === "p1"
          ? { x1: p.x, y1: p.y }
          : { x2: p.x, y2: p.y }) as Partial<LineEl>,
      );
    } else {
      const o = d.orig;
      const dx = p.x - d.startX;
      const dy = p.y - d.startY;
      let x = o.x,
        y = o.y,
        w = o.width,
        h = o.height;
      const east = d.corner.includes("e");
      const west = d.corner.includes("w");
      const south = d.corner.includes("s");
      const north = d.corner.includes("n");
      if (east) w = o.width + dx;
      if (west) {
        w = o.width - dx;
        x = o.x + dx;
      }
      if (south) h = o.height + dy;
      if (north) {
        h = o.height - dy;
        y = o.y + dy;
      }
      const MIN = 12;
      if (w < MIN) {
        if (west) x = o.x + o.width - MIN;
        w = MIN;
      }
      if (h < MIN) {
        if (north) y = o.y + o.height - MIN;
        h = MIN;
      }
      if (d.aspect) {
        h = w * d.aspect;
        if (north) y = o.y + o.height - h;
      }
      updateEl(d.id, { x, y, width: w, height: h } as Partial<EditElement>);
    }
  };

  const onPageUp = () => {
    const c = creatingRef.current;
    if (c) {
      const el = elementsRef.current.find((x) => x.id === c.id);
      let valid = true;
      if (el) {
        if (el.type === "line")
          valid = Math.hypot(el.x2 - el.x1, el.y2 - el.y1) > 4;
        else if (el.type === "draw") valid = el.points.length > 1;
        else if ("width" in el) {
          if (el.type === "note" && el.width < 8 && el.height < 8) {
            updateEl(el.id, { width: 180, height: 96 } as Partial<NoteEl>);
            valid = true;
          } else valid = el.width > 4 || el.height > 4;
        }
      }
      if (valid) {
        pushHistory(snapshotRef.current ?? elementsRef.current);
        setTool("select");
      } else {
        setElements((prev) => prev.filter((x) => x.id !== c.id));
        setSelectedId(null);
      }
      creatingRef.current = null;
    }
    dragRef.current = null;
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory(elementsRef.current);
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };
  const duplicateSelected = () => {
    const el = elements.find((x) => x.id === selectedId);
    if (!el) return;
    pushHistory(elementsRef.current);
    const id = genId();
    const copy: EditElement =
      el.type === "line"
        ? { ...el, id, x1: el.x1 + 12, y1: el.y1 + 12, x2: el.x2 + 12, y2: el.y2 + 12 }
        : el.type === "draw" || el.type === "polygon"
          ? { ...el, id, points: el.points.map((p) => ({ x: p.x + 12, y: p.y + 12 })) }
          : ({ ...el, id, x: (el as any).x + 12, y: (el as any).y + 12 } as EditElement);
    setElements((prev) => [...prev, copy]);
    setSelectedId(id);
  };

  // --- polygon ---------------------------------------------------------------
  const finalizePolygon = () => {
    const cur = polyRef.current;
    if (cur && cur.points.length >= 2) {
      pushHistory(elementsRef.current);
      const el: PolygonEl = {
        id: genId(),
        type: "polygon",
        pageIndex: cur.pageIndex,
        points: cur.points,
        color: draft.color,
        strokeWidth: draft.strokeWidth,
      };
      setElements((prev) => [...prev, el]);
      setSelectedId(el.id);
      setTool("select");
    }
    setPoly(null);
    setPolyTip(null);
  };
  const cancelPolygon = () => {
    setPoly(null);
    setPolyTip(null);
  };

  // --- text engine (Edit-text + Search) --------------------------------------
  // Extract every text run once, lazily, and cache it. Invalidated on load and
  // whenever the page set changes (Manage pages).
  const ensureText = useCallback(async (): Promise<PageTextItem[][]> => {
    if (textByPage) return textByPage;
    if (!srcBytes) return [];
    // Dedupe concurrent extractions (e.g. fast typing in search): all callers
    // await the same in-flight promise instead of re-parsing the PDF N times.
    if (textPromiseRef.current) return textPromiseRef.current;
    setTextBusy(true);
    const p = (async () => {
      try {
        const items = await extractPageTexts(srcBytes);
        setTextByPage(items);
        return items;
      } catch (err) {
        console.error(err);
        toast({
          title: "Could not read the document text",
          variant: "destructive",
        });
        return [] as PageTextItem[][];
      } finally {
        setTextBusy(false);
        textPromiseRef.current = null;
      }
    })();
    textPromiseRef.current = p;
    return p;
  }, [srcBytes, textByPage, toast]);

  // Pick the page the user is actually looking at (the one with the most area
  // in the viewport), falling back to the last active page.
  const getMostVisiblePageIndex = (): number => {
    let best = activePage;
    let bestVisible = -1;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    for (const p of pages) {
      const node = pageRefs.current[p.pageIndex];
      if (!node) continue;
      const r = node.getBoundingClientRect();
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible > bestVisible) {
        bestVisible = visible;
        best = p.pageIndex;
      }
    }
    return best;
  };

  // Make EVERY text run on the current page editable at once: cover each run
  // with white and drop an editable text box on top, matching its colour, size
  // and font. Re-running skips runs that already have an editable text box at
  // that spot, so covers never stack and prior edits are preserved.
  const handleEditWholePage = async () => {
    if (editingWholePageRef.current) return;
    editingWholePageRef.current = true;
    try {
      // Lock onto the page the user is looking at NOW, before text extraction
      // (which may await) lets them scroll to a different page.
      const pageIndex = getMostVisiblePageIndex();
      const items = await ensureText();
      const runs = (items[pageIndex] ?? []).filter(
        (it) => it.str.trim().length > 0,
      );
      if (runs.length === 0) {
        toast({
          title: "No editable text on this page",
          description:
            "This page looks scanned or image-only — text editing needs real, selectable PDF text.",
        });
        return;
      }
      const existing = elementsRef.current.filter(
        (el): el is TextEl => el.type === "text" && el.pageIndex === pageIndex,
      );
      // Build the runs we'll make editable, skipping two kinds of duplicates:
      //   1. runs that already have an editable box (preserves earlier edits)
      //   2. OVERPRINTED duplicates within this page. Many generated PDFs
      //      (e.g. bank statements) fake bold by printing the same string twice
      //      a hair apart; pdf.js returns BOTH. Turning each into its own box
      //      stacks two text elements (and two whiteouts) at the same spot —
      //      which looks like "double text" and forces the user to delete twice.
      //      Collapsing same-string, near-coincident runs fixes both symptoms.
      // Fraction of the SMALLER box's area covered by the intersection of two
      // run boxes. Two runs that occupy the same area (overprint, drop-shadow,
      // or a full-line copy that pdf.js ALSO split into word fragments) overlap
      // heavily; genuinely distinct text (side-by-side words, stacked lines)
      // does not.
      const overlapFrac = (a: (typeof runs)[number], b: (typeof runs)[number]) => {
        const ix =
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const iy =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (ix <= 0 || iy <= 0) return 0;
        const minArea = Math.min(
          a.width * a.height,
          b.width * b.height,
        );
        return minArea > 0 ? (ix * iy) / minArea : 0;
      };
      // Process the largest-area runs first so that when a full-line run and a
      // word fragment of it both exist, the FULL line is accepted and the
      // fragment is collapsed into it (never the other way round — which would
      // silently drop text). Makes dedup independent of pdf.js emit order.
      const ordered = [...runs].sort(
        (a, b) => b.width * b.height - a.width * a.height,
      );
      const fresh: typeof runs = [];
      for (const run of ordered) {
        const alreadyEditable = existing.some(
          (el) => Math.abs(el.x - run.x) < 3 && Math.abs(el.y - run.y) < 3,
        );
        if (alreadyEditable) continue;
        const tol = Math.max(2, run.fontSize * 0.5);
        const dupInBatch = fresh.some((f) => {
          // 1. Same string, near-coincident: classic fake-bold overprint.
          if (
            f.str.trim() === run.str.trim() &&
            Math.abs(f.x - run.x) < tol &&
            Math.abs(f.y - run.y) < tol
          )
            return true;
          // 2. Heavy geometric overlap of similar-size runs. Catches duplicates
          //    pdf.js reports with different strings/fragments or a larger
          //    offset (the source of "doubled / overlapping text").
          const ratio = run.fontSize / f.fontSize;
          if (ratio > 0.7 && ratio < 1.4 && overlapFrac(f, run) > 0.6)
            return true;
          return false;
        });
        if (dupInBatch) continue;
        fresh.push(run);
      }
      if (fresh.length === 0) {
        toast({ title: "This page's text is already editable" });
        setTool("select");
        return;
      }
      const page = pageById(pageIndex);
      const boxes = fresh.map((hit) => {
        const pad = hit.fontSize * 0.25;
        return {
          x: Math.max(0, hit.x - 1),
          y: Math.max(0, hit.y - pad),
          width: hit.width + 2,
          height: hit.height + pad * 2,
        };
      });
      const colors = await sampleTextColors(page.dataUrl, page.width, boxes);
      pushHistory(elementsRef.current);
      // All white covers first, then all text, so a later line's cover can
      // never paint over an earlier line's editable text.
      const covers: ShapeEl[] = [];
      const texts: TextEl[] = [];
      fresh.forEach((hit, i) => {
        const box = boxes[i];
        covers.push({
          id: genId(),
          type: "whiteout",
          pageIndex,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          color: "#ffffff",
          strokeWidth: 1,
        });
        texts.push({
          id: genId(),
          type: "text",
          pageIndex,
          x: hit.x,
          y: hit.y,
          text: hit.str,
          fontSize: hit.fontSize,
          color: colors[i],
          family: hit.family,
          bold: hit.bold,
          italic: hit.italic,
        });
      });
      setElements((prev) => [...prev, ...covers, ...texts]);
      setSelectedId(null);
      setActivePage(pageIndex);
      setTool("select");
      toast({
        title: `Page ${pageIndex + 1} is ready to edit`,
        description: `${fresh.length} text ${
          fresh.length === 1 ? "block" : "blocks"
        } are now editable — click any to change it.`,
      });
    } finally {
      editingWholePageRef.current = false;
    }
  };

  // --- search ----------------------------------------------------------------
  const runSearch = async (q: string) => {
    setQuery(q);
    const seq = ++searchSeqRef.current;
    const term = q.trim().toLowerCase();
    if (!term) {
      setMatches([]);
      setMatchIdx(0);
      return;
    }
    const items = await ensureText();
    // A slower earlier extraction must not overwrite a newer query's results.
    if (seq !== searchSeqRef.current) return;
    const found: typeof matches = [];
    items.forEach((pageItems, pageIndex) => {
      for (const it of pageItems) {
        const hay = it.str.toLowerCase();
        let from = 0;
        while (true) {
          const at = hay.indexOf(term, from);
          if (at < 0) break;
          // approximate the match box within the run by character ratio
          const perChar = it.width / Math.max(it.str.length, 1);
          found.push({
            pageIndex,
            x: it.x + perChar * at,
            y: it.y,
            width: perChar * term.length,
            height: it.height,
          });
          from = at + term.length;
        }
      }
    });
    setMatches(found);
    setMatchIdx(0);
    if (found.length) scrollToMatch(found[0]);
  };

  const scrollToMatch = (m: { pageIndex: number }) => {
    pageRefs.current[m.pageIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    setActivePage(m.pageIndex);
  };
  const stepMatch = (dir: 1 | -1) => {
    if (!matches.length) return;
    const next = (matchIdx + dir + matches.length) % matches.length;
    setMatchIdx(next);
    scrollToMatch(matches[next]);
  };

  // --- export ----------------------------------------------------------------
  const buildPdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.load(srcBytes!);
    const fontCache = new Map<StandardFonts, any>();
    const getFont = async (sf: StandardFonts) => {
      if (!fontCache.has(sf)) fontCache.set(sf, await doc.embedFont(sf));
      return fontCache.get(sf);
    };
    const docPages = doc.getPages();
    const drawSafeText = (
      page: any,
      text: string,
      opts: any,
    ) => {
      try {
        page.drawText(sanitize(text), opts);
      } catch {
        page.drawText(text.replace(/[^\x20-\x7E]/g, ""), opts);
      }
    };

    for (const el of elements) {
      const page = docPages[el.pageIndex];
      if (!page) continue;
      const H = page.getHeight();

      if (el.type === "text") {
        const font = await getFont(stdFont(el.family, el.bold, el.italic));
        const { r, g, b } = hexToRgb01(el.color);
        drawSafeText(page, el.text, {
          x: el.x,
          y: H - el.y - el.fontSize,
          size: el.fontSize,
          font,
          color: rgb(r, g, b),
        });
      } else if (el.type === "image") {
        const img =
          el.format === "png"
            ? await doc.embedPng(el.bytes)
            : await doc.embedJpg(el.bytes);
        page.drawImage(img, {
          x: el.x,
          y: H - el.y - el.height,
          width: el.width,
          height: el.height,
        });
      } else if (el.type === "line") {
        const { r, g, b } = hexToRgb01(el.color);
        const sx = el.x1,
          sy = H - el.y1,
          ex = el.x2,
          ey = H - el.y2;
        page.drawLine({
          start: { x: sx, y: sy },
          end: { x: ex, y: ey },
          thickness: el.strokeWidth,
          color: rgb(r, g, b),
          lineCap: LineCapStyle.Round,
        });
        if (el.variant === "arrow") {
          const ang = Math.atan2(ey - sy, ex - sx);
          const len = Math.max(8, el.strokeWidth * 3.5);
          const spread = Math.PI / 7;
          for (const s of [ang + Math.PI - spread, ang + Math.PI + spread]) {
            page.drawLine({
              start: { x: ex, y: ey },
              end: { x: ex + len * Math.cos(s), y: ey + len * Math.sin(s) },
              thickness: el.strokeWidth,
              color: rgb(r, g, b),
              lineCap: LineCapStyle.Round,
            });
          }
        }
      } else if (el.type === "ellipse") {
        const { r, g, b } = hexToRgb01(el.color);
        page.drawEllipse({
          x: el.x + el.width / 2,
          y: H - el.y - el.height / 2,
          xScale: Math.max(el.width / 2, 0.1),
          yScale: Math.max(el.height / 2, 0.1),
          borderColor: rgb(r, g, b),
          borderWidth: el.strokeWidth,
        });
      } else if (el.type === "polygon") {
        const { r, g, b } = hexToRgb01(el.color);
        const pts = el.points;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const c = pts[(i + 1) % pts.length];
          page.drawLine({
            start: { x: a.x, y: H - a.y },
            end: { x: c.x, y: H - c.y },
            thickness: el.strokeWidth,
            color: rgb(r, g, b),
            lineCap: LineCapStyle.Round,
          });
        }
      } else if (el.type === "link") {
        page.drawRectangle({
          x: el.x,
          y: H - el.y - el.height,
          width: el.width,
          height: el.height,
          borderColor: rgb(0.15, 0.39, 0.92),
          borderWidth: 1,
          color: rgb(0.15, 0.39, 0.92),
          opacity: 0.06,
        });
        const url = /^https?:\/\//i.test(el.url) ? el.url : `https://${el.url}`;
        const annot = doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [el.x, H - el.y - el.height, el.x + el.width, H - el.y],
          Border: [0, 0, 0],
          A: doc.context.obj({
            Type: "Action",
            S: "URI",
            URI: PDFString.of(url),
          }),
        });
        const ref = doc.context.register(annot);
        let annots = page.node.Annots();
        if (!annots) {
          annots = doc.context.obj([]);
          page.node.set(PDFName.of("Annots"), annots);
        }
        annots.push(ref);
      } else if (el.type === "draw") {
        const { r, g, b } = hexToRgb01(el.color);
        for (let i = 1; i < el.points.length; i++) {
          const a = el.points[i - 1];
          const c = el.points[i];
          page.drawLine({
            start: { x: a.x, y: H - a.y },
            end: { x: c.x, y: H - c.y },
            thickness: el.strokeWidth,
            color: rgb(r, g, b),
            lineCap: LineCapStyle.Round,
          });
        }
      } else if (el.type === "rect") {
        const { r, g, b } = hexToRgb01(el.color);
        page.drawRectangle({
          x: el.x,
          y: H - el.y - el.height,
          width: el.width,
          height: el.height,
          borderColor: rgb(r, g, b),
          borderWidth: el.strokeWidth,
        });
      } else if (el.type === "highlight") {
        const { r, g, b } = hexToRgb01(el.color);
        page.drawRectangle({
          x: el.x,
          y: H - el.y - el.height,
          width: el.width,
          height: el.height,
          color: rgb(r, g, b),
          opacity: 0.35,
        });
      } else if (el.type === "whiteout") {
        page.drawRectangle({
          x: el.x,
          y: H - el.y - el.height,
          width: el.width,
          height: el.height,
          color: rgb(1, 1, 1),
        });
      } else if (el.type === "stamp") {
        const font = await getFont(StandardFonts.HelveticaBold);
        const { r, g, b } = hexToRgb01(el.color);
        const pad = el.fontSize * 0.5;
        const tw = font.widthOfTextAtSize(el.label, el.fontSize);
        const w = tw + pad * 2;
        const h = el.fontSize + pad * 2;
        page.drawRectangle({
          x: el.x,
          y: H - el.y - h,
          width: w,
          height: h,
          borderColor: rgb(r, g, b),
          borderWidth: 2,
          color: rgb(r, g, b),
          opacity: 0.08,
        });
        drawSafeText(page, el.label, {
          x: el.x + pad,
          y: H - el.y - pad - el.fontSize * 0.82,
          size: el.fontSize,
          font,
          color: rgb(r, g, b),
        });
      } else if (el.type === "note") {
        const font = await getFont(StandardFonts.Helvetica);
        page.drawRectangle({
          x: el.x,
          y: H - el.y - el.height,
          width: el.width,
          height: el.height,
          color: rgb(0.996, 0.953, 0.78),
          borderColor: rgb(0.96, 0.62, 0.04),
          borderWidth: 1,
        });
        const size = 11;
        const pad = 6;
        const maxW = el.width - pad * 2;
        const words = sanitize(el.text).split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let line = "";
        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (font.widthOfTextAtSize(test, size) > maxW && line) {
            lines.push(line);
            line = w;
          } else line = test;
        }
        if (line) lines.push(line);
        let ty = H - el.y - pad - size;
        for (const ln of lines) {
          if (ty < H - el.y - el.height + 2) break;
          drawSafeText(page, ln, {
            x: el.x + pad,
            y: ty,
            size,
            font,
            color: rgb(0.2, 0.18, 0.05),
          });
          ty -= size * 1.3;
        }
      }
    }
    return doc.save();
  };

  const exportPdf = async () => {
    if (!srcBytes) return;
    setExporting(true);
    try {
      const out = await buildPdf();
      downloadPdf(out, `${stripExt(file?.name ?? "document")}-edited.pdf`);
      toast({ title: "Saved", description: "Your edited PDF was downloaded." });
    } catch (err) {
      console.error(err);
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const printPdf = async () => {
    if (!srcBytes) return;
    setExporting(true);
    try {
      const out = await buildPdf();
      const blob = new Blob([out as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) {
        w.addEventListener("load", () => {
          w.focus();
          w.print();
        });
      } else {
        toast({
          title: "Pop-up blocked",
          description: "Allow pop-ups to print, or use Save PDF.",
          variant: "destructive",
        });
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      toast({ title: "Could not prepare print", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // --- keyboard --------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      const meta = e.ctrlKey || e.metaKey;
      if (!typing && tool === "polygon" && poly) {
        if (e.key === "Enter") {
          e.preventDefault();
          finalizePolygon();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          cancelPolygon();
          return;
        }
      }
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!typing && (e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setTool("select");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, past, future, tool, poly]);

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadPdf(f);
    e.target.value = "";
  };

  const selected = elements.find((el) => el.id === selectedId) ?? null;

  // --- empty state -----------------------------------------------------------
  if (pages.length === 0) {
    const editCfg = toolConfigs["edit-pdf"];
    return (
      <div className="max-w-3xl mx-auto px-4">
        <PdfDropzone
          onFile={loadPdf}
          loading={loading}
          toolId={editCfg.id}
        />
      </div>
    );
  }

  // --- tool button -----------------------------------------------------------
  const ToolBtn = ({
    id,
    label,
    icon: Icon,
    onClick,
  }: {
    id: Tool | "image-btn" | "signature-btn" | "edittext";
    label: string;
    icon: React.ComponentType<any>;
    onClick: () => void;
  }) => {
    const active = id === tool;
    return (
      <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`flex flex-col items-center justify-center w-[58px] h-[52px] rounded-lg text-[11px] gap-0.5 border transition-colors ${
          active
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
        }`}
        data-testid={`button-tool-${id}`}
      >
        <Icon className="w-[18px] h-[18px]" />
        {label}
      </button>
    );
  };

  // --- line / shape dropdown -------------------------------------------------
  const LINE_TOOLS: { id: Tool; label: string; icon: React.ComponentType<any> }[] =
    [
      { id: "line", label: "Line", icon: Minus },
      { id: "arrow", label: "Arrow", icon: ArrowUpRight },
      { id: "rect", label: "Box", icon: Square },
      { id: "ellipse", label: "Circle", icon: Circle },
      { id: "polygon", label: "Polygon", icon: Hexagon },
    ];
  const activeLine =
    LINE_TOOLS.find((t) => t.id === tool) ?? LINE_TOOLS[0];
  const lineActive = LINE_TOOLS.some((t) => t.id === tool);
  const LineMenu = () => (
    <Popover open={lineMenuOpen} onOpenChange={setLineMenuOpen}>
      <PopoverTrigger asChild>
        <button
          title="Shapes"
          aria-label="Shapes"
          className={`relative flex flex-col items-center justify-center w-[58px] h-[52px] rounded-lg text-[11px] gap-0.5 border transition-colors ${
            lineActive
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
          }`}
          data-testid="button-tool-shapes"
        >
          <activeLine.icon className="w-[18px] h-[18px]" />
          <span className="flex items-center gap-0.5">
            {activeLine.label}
            <ChevronDown className="w-3 h-3" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {LINE_TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTool(t.id);
              setLineMenuOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              tool === t.id
                ? "bg-blue-50 text-blue-700"
                : "hover:bg-gray-100 text-gray-700"
            }`}
            data-testid={`menu-shape-${t.id}`}
          >
            <t.icon className="w-4 h-4" />
            <span className="flex-1 text-left">{t.label}</span>
            {tool === t.id && <Check className="w-4 h-4" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );

  const showText = tool === "text" || selected?.type === "text";
  const showStroke =
    tool === "draw" ||
    tool === "line" ||
    tool === "arrow" ||
    tool === "rect" ||
    tool === "ellipse" ||
    tool === "polygon" ||
    selected?.type === "draw" ||
    selected?.type === "line" ||
    selected?.type === "rect" ||
    selected?.type === "ellipse" ||
    selected?.type === "polygon";
  const showHighlight = tool === "highlight" || selected?.type === "highlight";
  const showStamp = tool === "stamp" || selected?.type === "stamp";
  const showNote = selected?.type === "note";
  const showLink = tool === "link" || selected?.type === "link";

  // value/setter that targets the selected element if present, else the draft
  const setColor = (c: string) => {
    if (selected && "color" in selected)
      propEdit(`${selected.id}:strokecolor`, selected.id, { color: c } as any);
    else setDraft((d) => ({ ...d, color: c }));
  };
  const colorValue =
    selected && "color" in selected ? (selected as any).color : draft.color;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      {/* Pinned controls — stay in place while only the document scrolls */}
      <div className="sticky top-0 z-30 bg-gray-50 dark:bg-gray-900 pt-2">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 mb-2 shadow-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          data-testid="button-new-file"
        >
          New file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={onFilePicked}
        />
        <div className="w-px h-6 bg-gray-200" />
        <Button
          variant="outline"
          size="icon"
          onClick={undo}
          disabled={!past.length}
          title="Undo"
          data-testid="button-undo"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={redo}
          disabled={!future.length}
          title="Redo"
          data-testid="button-redo"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200" />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => clamp(+(z - 0.15).toFixed(2), 0.4, 3))}
          title="Zoom out"
          data-testid="button-zoom-out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-gray-600 w-12 text-center" data-testid="text-zoom">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => clamp(+(z + 0.15).toFixed(2), 0.4, 3))}
          title="Zoom in"
          data-testid="button-zoom-in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowThumbs((s) => !s)}
          title="Toggle thumbnails"
          data-testid="button-toggle-thumbs"
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200" />
        <Button
          variant={searchOpen ? "default" : "outline"}
          size="icon"
          onClick={() => setSearchOpen((s) => !s)}
          title="Search text"
          className={searchOpen ? "bg-blue-600 hover:bg-blue-700" : ""}
          data-testid="button-toggle-search"
        >
          <SearchIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setManageOpen(true)}
          title="Manage pages"
          data-testid="button-manage-pages"
        >
          <Files className="w-4 h-4 mr-1" /> Manage page
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={printPdf}
          disabled={exporting}
          data-testid="button-print"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
        <Button
          size="sm"
          onClick={exportPdf}
          disabled={exporting}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-save"
        >
          {exporting ? (
            <ProcessingSpinner size={16} tone="light" className="mr-1" />
          ) : (
            <Download className="w-4 h-4 mr-1" />
          )}
          Save PDF
        </Button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 mb-2 shadow-sm">
          <SearchIcon className="w-4 h-4 text-gray-400" />
          <input
            autoFocus
            className="flex-1 min-w-[120px] px-2 py-1 text-sm outline-none"
            placeholder="Search document text…"
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") stepMatch(e.shiftKey ? -1 : 1);
              if (e.key === "Escape") setSearchOpen(false);
            }}
            data-testid="input-search"
          />
          <span
            className="text-xs text-gray-500 tabular-nums min-w-[64px] text-center"
            data-testid="text-search-count"
          >
            {textBusy
              ? "Reading…"
              : matches.length
                ? `${matchIdx + 1} of ${matches.length}`
                : query.trim()
                  ? "No results"
                  : ""}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => stepMatch(-1)}
            disabled={!matches.length}
            title="Previous"
            data-testid="button-search-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => stepMatch(1)}
            disabled={!matches.length}
            title="Next"
            data-testid="button-search-next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSearchOpen(false)}
            title="Close search"
            data-testid="button-search-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Tools */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-2 mb-2 shadow-sm">
        <ToolBtn id="select" label="Select" icon={MousePointer2} onClick={() => setTool("select")} />
        <ToolBtn id="text" label="Add text" icon={Type} onClick={() => setTool("text")} />
        <ToolBtn id="edittext" label="Edit text" icon={TextCursorInput} onClick={() => void handleEditWholePage()} />
        <ToolBtn id="signature-btn" label="Sign" icon={PenTool} onClick={() => setSigOpen(true)} />
        <ToolBtn id="draw" label="Draw" icon={Pencil} onClick={() => setTool("draw")} />
        <LineMenu />
        <ToolBtn id="highlight" label="Highlight" icon={Highlighter} onClick={() => setTool("highlight")} />
        <ToolBtn id="image-btn" label="Image" icon={ImageIcon} onClick={() => imageInputRef.current?.click()} />
        <ToolBtn id="stamp" label="Stamp" icon={StampIcon} onClick={() => setTool("stamp")} />
        <ToolBtn id="link" label="Link" icon={Link2} onClick={() => setTool("link")} />
        <ToolBtn id="note" label="Note" icon={StickyNote} onClick={() => setTool("note")} />
        <ToolBtn id="whiteout" label="Whiteout" icon={Eraser} onClick={() => setTool("whiteout")} />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={onImagePicked}
        />
      </div>

      {/* Options bar */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 min-h-[48px]">
        {showText && (
          <>
            <select
              className="px-2 py-1 rounded border bg-white text-sm"
              value={selected?.type === "text" ? selected.family : draft.family}
              onChange={(e) => {
                const family = e.target.value as FontFamily;
                if (selected?.type === "text") discreteEdit(selected.id, { family });
                else setDraft((d) => ({ ...d, family }));
              }}
              data-testid="select-font-family"
            >
              <option value="Helvetica">Helvetica</option>
              <option value="Times">Times</option>
              <option value="Courier">Courier</option>
            </select>
            <label className="text-sm flex items-center gap-1">
              Size
              <input
                type="number"
                min={6}
                max={144}
                className="w-16 px-2 py-1 rounded border bg-white"
                value={selected?.type === "text" ? selected.fontSize : draft.fontSize}
                onChange={(e) => {
                  const fontSize = clamp(Number(e.target.value) || 6, 6, 144);
                  if (selected?.type === "text")
                    propEdit(`${selected.id}:fontSize`, selected.id, { fontSize });
                  else setDraft((d) => ({ ...d, fontSize }));
                }}
                data-testid="input-font-size"
              />
            </label>
            <button
              onClick={() => {
                if (selected?.type === "text")
                  discreteEdit(selected.id, { bold: !selected.bold });
                else setDraft((d) => ({ ...d, bold: !d.bold }));
              }}
              className={`w-8 h-8 rounded border font-bold ${
                (selected?.type === "text" ? selected.bold : draft.bold)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
              data-testid="button-bold"
            >
              B
            </button>
            <button
              onClick={() => {
                if (selected?.type === "text")
                  discreteEdit(selected.id, { italic: !selected.italic });
                else setDraft((d) => ({ ...d, italic: !d.italic }));
              }}
              className={`w-8 h-8 rounded border italic ${
                (selected?.type === "text" ? selected.italic : draft.italic)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
              data-testid="button-italic"
            >
              I
            </button>
            <input
              type="color"
              className="h-8 w-10 rounded border"
              value={selected?.type === "text" ? selected.color : draft.color}
              onChange={(e) => {
                if (selected?.type === "text")
                  propEdit(`${selected.id}:textcolor`, selected.id, { color: e.target.value });
                else setDraft((d) => ({ ...d, color: e.target.value }));
              }}
              data-testid="input-text-color"
            />
          </>
        )}

        {showStroke && (
          <>
            <label className="text-sm flex items-center gap-2">
              Color
              <input
                type="color"
                className="h-8 w-10 rounded border"
                value={colorValue}
                onChange={(e) => setColor(e.target.value)}
                data-testid="input-stroke-color"
              />
            </label>
            <label className="text-sm flex items-center gap-2">
              Width
              <input
                type="range"
                min={1}
                max={20}
                value={
                  selected && "strokeWidth" in selected
                    ? (selected as any).strokeWidth
                    : draft.strokeWidth
                }
                onChange={(e) => {
                  const strokeWidth = Number(e.target.value);
                  if (selected && "strokeWidth" in selected)
                    propEdit(`${selected.id}:strokeWidth`, selected.id, {
                      strokeWidth,
                    } as any);
                  else setDraft((d) => ({ ...d, strokeWidth }));
                }}
                data-testid="range-stroke-width"
              />
            </label>
          </>
        )}

        {showHighlight && (
          <label className="text-sm flex items-center gap-2">
            Highlight
            <input
              type="color"
              className="h-8 w-10 rounded border"
              value={selected?.type === "highlight" ? selected.color : draft.highlightColor}
              onChange={(e) => {
                if (selected?.type === "highlight")
                  propEdit(`${selected.id}:hlcolor`, selected.id, { color: e.target.value });
                else setDraft((d) => ({ ...d, highlightColor: e.target.value }));
              }}
              data-testid="input-highlight-color"
            />
          </label>
        )}

        {showStamp && (
          <>
            {selected?.type === "stamp" ? (
              <input
                className="px-2 py-1 rounded border bg-white text-sm"
                value={selected.label}
                onChange={(e) =>
                  propEdit(`${selected.id}:label`, selected.id, { label: e.target.value })
                }
                data-testid="input-stamp-label"
              />
            ) : (
              <select
                className="px-2 py-1 rounded border bg-white text-sm"
                value={draft.stampLabel}
                onChange={(e) => {
                  const preset = STAMP_PRESETS.find((p) => p.label === e.target.value)!;
                  setDraft((d) => ({
                    ...d,
                    stampLabel: preset.label,
                    stampColor: preset.color,
                  }));
                }}
                data-testid="select-stamp-preset"
              >
                {STAMP_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
            <input
              type="color"
              className="h-8 w-10 rounded border"
              value={selected?.type === "stamp" ? selected.color : draft.stampColor}
              onChange={(e) => {
                if (selected?.type === "stamp")
                  propEdit(`${selected.id}:stampcolor`, selected.id, { color: e.target.value });
                else setDraft((d) => ({ ...d, stampColor: e.target.value }));
              }}
              data-testid="input-stamp-color"
            />
          </>
        )}

        {showNote && selected?.type === "note" && (
          <textarea
            className="px-2 py-1 rounded border bg-white text-sm flex-1 min-w-[200px] resize-none"
            rows={1}
            value={selected.text}
            onChange={(e) =>
              propEdit(`${selected.id}:notetext`, selected.id, { text: e.target.value })
            }
            placeholder="Note text…"
            data-testid="input-note-content"
          />
        )}

        {showLink && (
          <label className="text-sm flex items-center gap-2 flex-1 min-w-[220px]">
            URL
            <input
              type="url"
              className="px-2 py-1 rounded border bg-white text-sm flex-1"
              value={selected?.type === "link" ? selected.url : draft.linkUrl}
              onChange={(e) => {
                if (selected?.type === "link")
                  propEdit(`${selected.id}:url`, selected.id, {
                    url: e.target.value,
                  } as any);
                else setDraft((d) => ({ ...d, linkUrl: e.target.value }));
              }}
              placeholder="https://example.com"
              data-testid="input-link-url"
            />
          </label>
        )}

        {tool === "polygon" && poly && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500" data-testid="text-polygon-hint">
              {poly.points.length} point{poly.points.length === 1 ? "" : "s"} ·
              click first point or Enter to finish
            </span>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={finalizePolygon}
              disabled={poly.points.length < 2}
              data-testid="button-finish-polygon"
            >
              Finish
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelPolygon}
              data-testid="button-cancel-polygon"
            >
              Cancel
            </Button>
          </div>
        )}

        {!showText &&
          !showStroke &&
          !showHighlight &&
          !showStamp &&
          !showNote &&
          !showLink && (
            <span className="text-sm text-gray-400" data-testid="text-options-hint">
              {tool === "select"
                ? selected
                  ? "Drag to move · drag a handle to resize"
                  : "Pick a tool, then click or drag on the page."
                : tool === "whiteout"
                  ? "Drag a box over content to cover it in white."
                  : tool === "image"
                    ? "Choose an image to place."
                    : "Click or drag on the page to add."}
            </span>
          )}

        <div className="flex-1" />
        {selected && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={duplicateSelected}
              data-testid="button-duplicate"
            >
              <Copy className="w-4 h-4 mr-1" /> Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelected}
              data-testid="button-delete"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </>
        )}
      </div>
      </div>

      <div className="flex gap-4">
        {/* Thumbnails */}
        {showThumbs && (
          <aside className="hidden md:block w-28 shrink-0 max-h-[78vh] overflow-y-auto pr-1">
            {pages.map((p) => (
              <button
                key={p.pageIndex}
                onClick={() => {
                  setActivePage(p.pageIndex);
                  pageRefs.current[p.pageIndex]?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                className={`block w-full mb-2 rounded border-2 overflow-hidden transition-colors ${
                  activePage === p.pageIndex
                    ? "border-blue-500"
                    : "border-gray-200 hover:border-blue-300"
                }`}
                data-testid={`thumb-${p.pageIndex}`}
              >
                <img src={p.dataUrl} alt={`Page ${p.pageIndex + 1}`} className="w-full block" />
                <span className="block text-[10px] text-gray-500 py-0.5">
                  {p.pageIndex + 1}
                </span>
              </button>
            ))}
          </aside>
        )}

        {/* Canvas */}
        <div className="flex-1 overflow-x-auto pb-12">
          <div className="flex flex-col items-center gap-6">
            {pages.map((page) => {
              const w = page.width * zoom;
              const pageEls = elements.filter((el) => el.pageIndex === page.pageIndex);
              const lineDraws = pageEls.filter(
                (el) =>
                  el.type === "line" ||
                  el.type === "draw" ||
                  el.type === "polygon",
              );
              return (
                <div key={page.pageIndex} className="flex flex-col items-center">
                  <div
                    ref={(n) => {
                      pageRefs.current[page.pageIndex] = n;
                    }}
                    className="relative shadow-lg select-none bg-white"
                    style={{
                      width: w,
                      cursor: tool === "select" ? "default" : "crosshair",
                      touchAction: "none",
                    }}
                    onPointerDown={(e) => onPageDown(e, page)}
                    onPointerMove={(e) => onPageMove(e, page)}
                    onPointerUp={onPageUp}
                    onPointerCancel={onPageUp}
                    data-testid={`page-${page.pageIndex}`}
                  >
                    <img
                      src={page.dataUrl}
                      alt={`Page ${page.pageIndex + 1}`}
                      className="w-full block pointer-events-none"
                      draggable={false}
                    />

                    {/* HTML overlays: text / image / shape / stamp / note */}
                    {pageEls.map((el) => {
                      if (
                        el.type === "line" ||
                        el.type === "draw" ||
                        el.type === "polygon"
                      )
                        return null;
                      const isSel = el.id === selectedId;
                      const interactive = tool === "select";
                      const common: React.CSSProperties = {
                        position: "absolute",
                        left: (el as any).x * zoom,
                        top: (el as any).y * zoom,
                        pointerEvents: interactive ? "auto" : "none",
                        cursor: interactive ? "move" : "inherit",
                      };
                      const selRing = isSel
                        ? "outline outline-2 outline-blue-500"
                        : "";
                      if (el.type === "text") {
                        const isEditing = editingTextId === el.id;
                        // While typing inline, show ONLY the blinking caret —
                        // no blue focus ring around the active field.
                        const textRing = isEditing ? "" : selRing;
                        const textStyle: React.CSSProperties = {
                          fontSize: el.fontSize * zoom,
                          color: el.color,
                          fontFamily: CSS_FONT[el.family],
                          fontWeight: el.bold ? 700 : 400,
                          fontStyle: el.italic ? "italic" : "normal",
                          whiteSpace: "pre",
                          lineHeight: 1,
                          display: "block",
                        };
                        return (
                          <div
                            key={el.id}
                            style={{
                              ...common,
                              pointerEvents: isEditing
                                ? "auto"
                                : common.pointerEvents,
                              cursor: isEditing
                                ? "text"
                                : interactive
                                  ? "text"
                                  : common.cursor,
                            }}
                            className={textRing}
                            onPointerDown={(e) => {
                              if (isEditing) return; // let caret clicks through
                              const now = Date.now();
                              const last = lastTextTapRef.current;
                              if (last.id === el.id && now - last.t < 400) {
                                // double-tap -> edit text inline on the page.
                                // preventDefault stops the browser's mousedown
                                // focus default from immediately blurring the
                                // inline editor we're about to mount + focus.
                                e.preventDefault();
                                e.stopPropagation();
                                lastTextTapRef.current = { id: "", t: 0 };
                                setSelectedId(el.id);
                                setEditingTextId(el.id);
                                return;
                              }
                              lastTextTapRef.current = { id: el.id, t: now };
                              onElementPointerDown(e, el);
                            }}
                            onDoubleClick={(e) => {
                              // fallback for environments where dblclick survives
                              e.stopPropagation();
                              setSelectedId(el.id);
                              setEditingTextId(el.id);
                            }}
                            data-testid={`el-${el.id}`}
                          >
                            {isEditing ? (
                              <InlineTextEditor
                                initial={el.text}
                                style={{
                                  ...textStyle,
                                  outline: "none",
                                  background: "transparent",
                                  caretColor: el.color,
                                  cursor: "text",
                                  minWidth: "1ch",
                                }}
                                onChange={(text) =>
                                  propEdit(`${el.id}:text`, el.id, { text })
                                }
                                onCommit={() => {
                                  setEditingTextId(null);
                                  editSessionRef.current = null;
                                }}
                                testId={`input-inline-${el.id}`}
                              />
                            ) : (
                              <span style={textStyle}>{el.text || " "}</span>
                            )}
                          </div>
                        );
                      }
                      if (el.type === "stamp") {
                        return (
                          <div
                            key={el.id}
                            style={common}
                            className={selRing}
                            onPointerDown={(e) => onElementPointerDown(e, el)}
                            data-testid={`el-${el.id}`}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                border: `${2 * zoom}px solid ${el.color}`,
                                color: el.color,
                                background: `${el.color}14`,
                                fontWeight: 700,
                                fontSize: el.fontSize * zoom,
                                padding: `${el.fontSize * 0.25 * zoom}px ${
                                  el.fontSize * 0.5 * zoom
                                }px`,
                                borderRadius: 4 * zoom,
                                fontFamily: CSS_FONT.Helvetica,
                                whiteSpace: "pre",
                                lineHeight: 1,
                              }}
                            >
                              {el.label}
                            </span>
                          </div>
                        );
                      }
                      // box-like: image, rect, highlight, whiteout, note
                      const boxStyle: React.CSSProperties = {
                        ...common,
                        width: (el as any).width * zoom,
                        height: (el as any).height * zoom,
                      };
                      let inner: React.ReactNode = null;
                      if (el.type === "image") {
                        inner = (
                          <img
                            src={el.dataUrl}
                            alt=""
                            draggable={false}
                            className="w-full h-full object-fill pointer-events-none"
                          />
                        );
                      } else if (el.type === "rect") {
                        boxStyle.border = `${el.strokeWidth * zoom}px solid ${el.color}`;
                      } else if (el.type === "highlight") {
                        boxStyle.background = el.color;
                        boxStyle.opacity = 0.35;
                      } else if (el.type === "whiteout") {
                        boxStyle.background = "#ffffff";
                        boxStyle.border = isSel ? undefined : "1px dashed #d1d5db";
                      } else if (el.type === "note") {
                        boxStyle.background = "#fef9c3";
                        boxStyle.border = "1px solid #f59e0b";
                        inner = (
                          <div
                            className="w-full h-full overflow-hidden pointer-events-none p-1 text-[#33300d]"
                            style={{
                              fontSize: 11 * zoom,
                              lineHeight: 1.3,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {el.text}
                          </div>
                        );
                      } else if (el.type === "ellipse") {
                        boxStyle.border = `${el.strokeWidth * zoom}px solid ${el.color}`;
                        boxStyle.borderRadius = "50%";
                      } else if (el.type === "link") {
                        boxStyle.border = "1px solid #f7433d";
                        boxStyle.background = "#f7433d14";
                        inner = (
                          <div
                            className="w-full h-full overflow-hidden pointer-events-none flex items-end"
                            style={{ color: "#e02d27" }}
                          >
                            <span
                              className="truncate underline px-1"
                              style={{ fontSize: Math.max(9, 11 * zoom) }}
                            >
                              {el.url}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={el.id}
                          style={boxStyle}
                          className={selRing}
                          onPointerDown={(e) => onElementPointerDown(e, el)}
                          data-testid={`el-${el.id}`}
                        >
                          {inner}
                          {isSel &&
                            interactive &&
                            (["nw", "ne", "sw", "se"] as const).map((corner) => (
                              <span
                                key={corner}
                                onPointerDown={(e) => onResizeDown(e, el, corner)}
                                className="absolute w-3 h-3 bg-blue-600 border-2 border-white rounded-full"
                                style={{
                                  left: corner.includes("w") ? -6 : undefined,
                                  right: corner.includes("e") ? -6 : undefined,
                                  top: corner.includes("n") ? -6 : undefined,
                                  bottom: corner.includes("s") ? -6 : undefined,
                                  cursor: `${corner}-resize`,
                                }}
                                data-testid={`handle-${corner}-${el.id}`}
                              />
                            ))}
                        </div>
                      );
                    })}

                    {/* SVG overlay: lines + freehand draws */}
                    <svg
                      className="absolute inset-0"
                      width={w}
                      height={page.height * zoom}
                      viewBox={`0 0 ${page.width} ${page.height}`}
                      preserveAspectRatio="none"
                      style={{ pointerEvents: "none" }}
                    >
                      {lineDraws.map((el) => {
                        const isSel = el.id === selectedId;
                        const hit = tool === "select" ? "stroke" : "none";
                        if (el.type === "line") {
                          const ang = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
                          const alen = Math.max(6, el.strokeWidth * 3.5);
                          const spread = Math.PI / 7;
                          const a1 = {
                            x: el.x2 - alen * Math.cos(ang - spread),
                            y: el.y2 - alen * Math.sin(ang - spread),
                          };
                          const a2 = {
                            x: el.x2 - alen * Math.cos(ang + spread),
                            y: el.y2 - alen * Math.sin(ang + spread),
                          };
                          return (
                            <g key={el.id}>
                              <line
                                x1={el.x1}
                                y1={el.y1}
                                x2={el.x2}
                                y2={el.y2}
                                stroke="transparent"
                                strokeWidth={el.strokeWidth + 12}
                                style={{ pointerEvents: hit, cursor: "move" }}
                                onPointerDown={(e) => onElementPointerDown(e as any, el)}
                              />
                              <line
                                x1={el.x1}
                                y1={el.y1}
                                x2={el.x2}
                                y2={el.y2}
                                stroke={el.color}
                                strokeWidth={el.strokeWidth}
                                strokeLinecap="round"
                                style={{ pointerEvents: "none" }}
                              />
                              {el.variant === "arrow" && (
                                <>
                                  <line
                                    x1={el.x2}
                                    y1={el.y2}
                                    x2={a1.x}
                                    y2={a1.y}
                                    stroke={el.color}
                                    strokeWidth={el.strokeWidth}
                                    strokeLinecap="round"
                                    style={{ pointerEvents: "none" }}
                                  />
                                  <line
                                    x1={el.x2}
                                    y1={el.y2}
                                    x2={a2.x}
                                    y2={a2.y}
                                    stroke={el.color}
                                    strokeWidth={el.strokeWidth}
                                    strokeLinecap="round"
                                    style={{ pointerEvents: "none" }}
                                  />
                                </>
                              )}
                            </g>
                          );
                        }
                        if (el.type === "polygon") {
                          const ppts = el.points
                            .map((p) => `${p.x},${p.y}`)
                            .join(" ");
                          return (
                            <g key={el.id}>
                              <polygon
                                points={ppts}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={el.strokeWidth + 12}
                                style={{ pointerEvents: hit, cursor: "move" }}
                                onPointerDown={(e) =>
                                  onElementPointerDown(e as any, el)
                                }
                              />
                              <polygon
                                points={ppts}
                                fill="none"
                                stroke={el.color}
                                strokeWidth={el.strokeWidth}
                                strokeLinejoin="round"
                                style={{ pointerEvents: "none" }}
                              />
                              {isSel &&
                                (() => {
                                  const b = boundsOf(el);
                                  return (
                                    <rect
                                      x={b.x}
                                      y={b.y}
                                      width={b.width}
                                      height={b.height}
                                      fill="none"
                                      stroke="#fb5d52"
                                      strokeWidth={1}
                                      strokeDasharray="4 4"
                                      vectorEffect="non-scaling-stroke"
                                      style={{ pointerEvents: "none" }}
                                    />
                                  );
                                })()}
                            </g>
                          );
                        }
                        const pts = el.points.map((p) => `${p.x},${p.y}`).join(" ");
                        return (
                          <g key={el.id}>
                            <polyline
                              points={pts}
                              fill="none"
                              stroke="transparent"
                              strokeWidth={el.strokeWidth + 12}
                              style={{ pointerEvents: hit, cursor: "move" }}
                              onPointerDown={(e) => onElementPointerDown(e as any, el)}
                            />
                            <polyline
                              points={pts}
                              fill="none"
                              stroke={el.color}
                              strokeWidth={el.strokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ pointerEvents: "none" }}
                            />
                            {isSel &&
                              (() => {
                                const b = boundsOf(el);
                                return (
                                  <rect
                                    x={b.x}
                                    y={b.y}
                                    width={b.width}
                                    height={b.height}
                                    fill="none"
                                    stroke="#fb5d52"
                                    strokeWidth={1}
                                    strokeDasharray="4 4"
                                    vectorEffect="non-scaling-stroke"
                                    style={{ pointerEvents: "none" }}
                                  />
                                );
                              })()}
                          </g>
                        );
                      })}

                      {/* in-progress polygon */}
                      {poly && poly.pageIndex === page.pageIndex && (
                        <g style={{ pointerEvents: "none" }}>
                          <polyline
                            points={[
                              ...poly.points,
                              ...(polyTip ? [polyTip] : []),
                            ]
                              .map((p) => `${p.x},${p.y}`)
                              .join(" ")}
                            fill="rgba(247, 67, 61,0.06)"
                            stroke="#f7433d"
                            strokeWidth={draft.strokeWidth}
                            strokeDasharray="4 3"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                          {poly.points.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r={i === 0 ? 5 : 3}
                              fill={i === 0 ? "#f7433d" : "#fff"}
                              stroke="#f7433d"
                              strokeWidth={1.5}
                              vectorEffect="non-scaling-stroke"
                            />
                          ))}
                        </g>
                      )}
                    </svg>

                    {/* line endpoint handles (HTML, constant px) */}
                    {tool === "select" &&
                      pageEls
                        .filter((el): el is LineEl => el.type === "line" && el.id === selectedId)
                        .map((el) => (
                          <React.Fragment key={`ep-${el.id}`}>
                            <span
                              onPointerDown={(e) => onEndpointDown(e, el, "p1")}
                              className="absolute w-3 h-3 bg-blue-600 border-2 border-white rounded-full"
                              style={{ left: el.x1 * zoom - 6, top: el.y1 * zoom - 6, cursor: "move" }}
                              data-testid={`endpoint-p1-${el.id}`}
                            />
                            <span
                              onPointerDown={(e) => onEndpointDown(e, el, "p2")}
                              className="absolute w-3 h-3 bg-blue-600 border-2 border-white rounded-full"
                              style={{ left: el.x2 * zoom - 6, top: el.y2 * zoom - 6, cursor: "move" }}
                              data-testid={`endpoint-p2-${el.id}`}
                            />
                          </React.Fragment>
                        ))}

                    {/* search highlights */}
                    {searchOpen &&
                      matches
                        .map((m, i) => ({ m, i }))
                        .filter(({ m }) => m.pageIndex === page.pageIndex)
                        .map(({ m, i }) => (
                          <div
                            key={`match-${i}`}
                            className="absolute pointer-events-none rounded-[1px]"
                            style={{
                              left: m.x * zoom,
                              top: m.y * zoom,
                              width: m.width * zoom,
                              height: m.height * zoom,
                              background:
                                i === matchIdx
                                  ? "rgba(247, 67, 61,0.45)"
                                  : "rgba(250,204,21,0.45)",
                              outline:
                                i === matchIdx ? "1px solid #e02d27" : "none",
                            }}
                            data-testid={`search-hit-${i}`}
                          />
                        ))}
                  </div>
                  <span className="text-xs text-gray-400 mt-1">
                    Page {page.pageIndex + 1} of {pages.length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Signature modal */}
      {sigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Draw your signature</h3>
              <button
                onClick={() => setSigOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                data-testid="button-close-signature"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <canvas
              ref={padRef}
              width={600}
              height={200}
              className="w-full bg-white border-2 border-dashed border-gray-300 rounded-lg touch-none cursor-crosshair"
              onPointerDown={padDown}
              onPointerMove={padMove}
              onPointerUp={padUp}
              onPointerLeave={padUp}
              data-testid="signature-pad"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={padClear} data-testid="button-clear-signature">
                Clear
              </Button>
              <Button
                onClick={useSignature}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-use-signature"
              >
                Place signature
              </Button>
            </div>
          </div>
        </div>
      )}

      {srcBytes && (
        <ManagePagesModal
          open={manageOpen}
          onOpenChange={setManageOpen}
          srcBytes={srcBytes}
          pages={pages}
          onApply={applyPageChanges}
        />
      )}
    </div>
  );
};
