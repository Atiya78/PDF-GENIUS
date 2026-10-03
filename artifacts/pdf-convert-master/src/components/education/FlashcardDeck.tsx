import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Shuffle, X } from "lucide-react";
import type { EducationCard } from "@workspace/api-client-react";
import type { Mark } from "@/lib/education/storage";

interface Props {
  cards: EducationCard[];
  order: string[];
  marks: Record<string, Mark>;
  onMark: (id: string, m: Mark | null) => void;
  onShuffle: () => void;
  onResetMarks: () => void;
}

const editable = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

export function FlashcardDeck({ cards, order, marks, onMark, onShuffle, onResetMarks }: Props) {
  const [snapshot, setSnapshot] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const ordered = useMemo(() => {
    const byId = new Map(cards.map((c) => [c.id, c]));
    const seen = new Set<string>();
    const out: EducationCard[] = [];
    for (const id of order) { const c = byId.get(id); if (c && !seen.has(id)) { out.push(c); seen.add(id); } }
    for (const c of cards) if (!seen.has(c.id)) out.push(c);
    return out;
  }, [cards, order]);
  const visible = useMemo(() => {
    if (!snapshot) return ordered;
    const byId = new Map(cards.map((c) => [c.id, c]));
    return snapshot.map((id) => byId.get(id)).filter((c): c is EducationCard => !!c);
  }, [snapshot, ordered, cards]);

  const finished = visible.length > 0 && idx >= visible.length;
  const card = visible[idx];

  const go = useCallback((d: number) => { setFlipped(false); setIdx((i) => Math.max(0, Math.min(visible.length, i + d))); }, [visible.length]);
  const flip = useCallback(() => setFlipped((f) => !f), []);

  const goRef = useRef(go); goRef.current = go;
  const flipRef = useRef(flip); flipRef.current = flip;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (editable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goRef.current(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goRef.current(-1); }
      else if (e.key === " " && !["BUTTON", "A"].includes((e.target as HTMLElement).tagName)) { e.preventDefault(); flipRef.current(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const mark = (m: Mark) => { if (!card) return; onMark(card.id, m); go(1); };
  const statsIds = visible.map((c) => c.id);
  const know = statsIds.filter((id) => marks[id] === "know").length;
  const learning = statsIds.filter((id) => marks[id] === "learning").length;
  const learningIds = ordered.filter((c) => marks[c.id] === "learning").map((c) => c.id);

  if (cards.length === 0) return <p className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">This deck has no cards. Add one in the grid view.</p>;

  if (finished) {
    return (
      <div className="rounded-2xl bg-[#fff1f0] p-6 text-center" data-testid="panel-deck-complete">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#d9322c]">{snapshot ? "Review round finished" : "Deck finished"}</p>
        <p className="mt-3 text-gray-900"><strong data-testid="text-know-count">{know}</strong> known, <strong data-testid="text-learning-count">{learning}</strong> still learning, {visible.length - know - learning} unmarked</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {learningIds.length > 0 && <button type="button" onClick={() => { setSnapshot(learningIds); setIdx(0); setFlipped(false); }} className="h-10 rounded-full bg-[#f7433d] px-5 text-sm font-semibold text-white hover:bg-[#e03832]" data-testid="button-review-learning">Review only Still learning ({learningIds.length})</button>}
          <button type="button" onClick={() => { setSnapshot(null); setIdx(0); setFlipped(false); }} className="h-10 rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold" data-testid="button-review-all">Study full deck</button>
          <button type="button" onClick={() => { onResetMarks(); setSnapshot(null); setIdx(0); setFlipped(false); }} className="h-10 rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold" data-testid="button-reset-marks"><RotateCcw className="mr-1 inline h-4 w-4" aria-hidden="true" />Reset progress</button>
        </div>
      </div>
    );
  }
  if (!card) return <p className="text-gray-600">Nothing to study here.</p>;

  const faceBase: React.CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  return (
    <div data-testid="panel-study">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
        <span aria-live="polite" data-testid="text-card-progress">Card {idx + 1} of {visible.length}{snapshot ? " (still learning)" : ""}</span>
        <div className="flex gap-2">
          {snapshot && <button type="button" onClick={() => { setSnapshot(null); setIdx(0); setFlipped(false); }} className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold">Back to full deck</button>}
          <button type="button" onClick={() => { onShuffle(); setSnapshot(null); setIdx(0); setFlipped(false); }} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold hover:border-[#f7433d]" data-testid="button-shuffle"><Shuffle className="h-3.5 w-3.5" aria-hidden="true" />Shuffle</button>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-[#f7433d] transition-all" style={{ width: `${(idx / visible.length) * 100}%` }} /></div>
      <div
        className="mt-5 select-none"
        style={{ perspective: 1200, touchAction: "pan-y" }}
        onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={(e) => {
          const s = touch.current; touch.current = null; if (!s) return;
          const t = e.changedTouches[0]; const dx = t.clientX - s.x; const dy = t.clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        <button type="button" onClick={flip} aria-label={flipped ? "Showing answer. Flip to question" : "Showing question. Flip to answer"} aria-pressed={flipped} data-testid="button-flip-card"
          className="relative block h-64 w-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7433d] sm:h-72"
          style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none", transition: "transform 0.5s" }}>
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center text-xl font-semibold text-gray-900 shadow-md" style={faceBase}>
            <span className="absolute left-4 top-3 text-xs font-semibold uppercase tracking-wide text-[#d9322c]">Front</span><span className="max-h-full overflow-auto">{card.front}</span>
          </span>
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#fff1f0] p-6 text-center text-lg text-gray-900 shadow-md ring-1 ring-[#f7433d]/20" style={{ ...faceBase, transform: "rotateY(180deg)" }}>
            <span className="absolute left-4 top-3 text-xs font-semibold uppercase tracking-wide text-[#d9322c]">Back</span><span className="max-h-full overflow-auto">{card.back}</span>
          </span>
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">Click the card or press Space to flip. Arrow keys or swipe to move.</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous card" className="h-10 w-10 rounded-full border border-gray-300 disabled:opacity-40" data-testid="button-prev-card"><ChevronLeft className="mx-auto h-5 w-5" /></button>
        <button type="button" onClick={() => mark("learning")} className={`inline-flex h-10 items-center gap-1 rounded-full border px-4 text-sm font-semibold ${marks[card.id] === "learning" ? "border-amber-500 bg-amber-50 text-amber-800" : "border-gray-300 bg-white"}`} data-testid="button-mark-learning"><X className="h-4 w-4" aria-hidden="true" />Still learning</button>
        <button type="button" onClick={() => mark("know")} className={`inline-flex h-10 items-center gap-1 rounded-full border px-4 text-sm font-semibold ${marks[card.id] === "know" ? "border-green-600 bg-green-50 text-green-800" : "border-gray-300 bg-white"}`} data-testid="button-mark-know"><Check className="h-4 w-4" aria-hidden="true" />I know this</button>
        <button type="button" onClick={() => go(1)} aria-label="Next card" className="h-10 w-10 rounded-full border border-gray-300" data-testid="button-next-card"><ChevronRight className="mx-auto h-5 w-5" /></button>
      </div>
    </div>
  );
}
