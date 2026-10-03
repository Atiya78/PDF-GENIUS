import { useState } from "react";
import { Copy, FileText, FileSpreadsheet, FileDown, Trash2 } from "lucide-react";
import type { EducationDeck } from "@workspace/api-client-react";
import { cardsToAnki, cardsToCsv, copyText, downloadText, formatDeckText, requestExport, slugify } from "@/lib/education/exportHelpers";
import type { Mark } from "@/lib/education/storage";
import { ExportMenu } from "./ExportMenu";
import { FlashcardDeck } from "./FlashcardDeck";
import { FlashcardGrid } from "./FlashcardGrid";
import { cn } from "@/lib/utils";

interface Props {
  deck: EducationDeck; marks: Record<string, Mark>; order: string[]; saveFailed: boolean;
  onDeck: (d: EducationDeck) => void; onMarks: (m: Record<string, Mark>) => void; onOrder: (o: string[]) => void;
  onClear: () => void; onExported: () => void;
}

export function FlashcardWorkspace({ deck, marks, order, saveFailed, onDeck, onMarks, onOrder, onClear, onExported }: Props) {
  const [view, setView] = useState<"study" | "grid">("study");
  const [confirmClear, setConfirmClear] = useState(false);
  const base = slugify(deck.title);
  const empty = deck.cards.length === 0;
  const tab = (v: "study" | "grid", label: string) => (
    <button type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} data-testid={`tab-cards-${v}`} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d]", view === v ? "bg-[#f7433d] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>{label}</button>
  );
  const shuffle = () => {
    const ids = deck.cards.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    onOrder(ids);
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" data-testid="panel-flashcards-result">
      <h2 className="font-['Poppins'] text-2xl font-bold text-gray-900" data-testid="text-deck-title">{deck.title}</h2>
      <p className="mt-1 text-sm text-gray-500">{deck.cards.length} cards. AI can make mistakes, so check cards against your source.</p>
      <div role="tablist" aria-label="Flashcard view" className="mt-4 flex gap-2">{tab("study", "Study")}{tab("grid", "All cards")}</div>
      <div className="mt-5">
        {view === "study" ? (
          <FlashcardDeck cards={deck.cards} order={order} marks={marks} onShuffle={shuffle} onResetMarks={() => onMarks({})}
            onMark={(id, m) => { const n = { ...marks }; if (m) n[id] = m; else delete n[id]; onMarks(n); }} />
        ) : (
          <FlashcardGrid cards={deck.cards} marks={marks}
            onSave={(d) => {
              if (d.id) onDeck({ ...deck, cards: deck.cards.map((c) => (c.id === d.id ? { ...c, front: d.front.trim(), back: d.back.trim() } : c)) });
              else onDeck({ ...deck, cards: [...deck.cards, { id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, front: d.front.trim(), back: d.back.trim(), sourcePage: null }] });
            }}
            onDelete={(id) => { onDeck({ ...deck, cards: deck.cards.filter((c) => c.id !== id) }); const n = { ...marks }; delete n[id]; onMarks(n); }} />
        )}
      </div>
      <div className="mt-6 border-t border-gray-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Export</h3>
        <ExportMenu disabledReason={empty ? "Add at least one card to export." : null} onExported={onExported} actions={[
          { id: "pdf", label: "Printable PDF (2x4)", icon: FileText, run: () => requestExport({ kind: "cards", format: "pdf", deck }, `${base}-cards.pdf`) },
          { id: "csv", label: "CSV", icon: FileSpreadsheet, run: () => downloadText(cardsToCsv(deck.cards), `${base}.csv`, "text/csv") },
          { id: "anki", label: "Anki TXT", icon: FileDown, run: () => downloadText(cardsToAnki(deck.cards), `${base}-anki.txt`, "text/plain") },
          { id: "copy", label: "Copy", icon: Copy, run: () => copyText(formatDeckText(deck)) },
        ]} />
      </div>
      <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600" data-testid="text-privacy-notice">
        <p>This deck and your progress are saved in this browser only. Your PDF and its text are never stored here.</p>
        {saveFailed && <p role="alert" className="mt-1 font-semibold text-red-600">Your browser blocked saving, so this deck will be lost on refresh. Export it to keep it.</p>}
        {confirmClear ? (
          <p className="mt-2 flex flex-wrap items-center gap-2"><span className="font-semibold text-gray-900">Delete this deck and progress?</span>
            <button type="button" onClick={() => { setConfirmClear(false); onClear(); }} className="rounded-full bg-red-600 px-4 py-1 text-xs font-semibold text-white" data-testid="button-confirm-clear">Yes, clear</button>
            <button type="button" onClick={() => setConfirmClear(false)} className="text-xs font-semibold">Cancel</button></p>
        ) : <button type="button" onClick={() => setConfirmClear(true)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline" data-testid="button-clear-saved"><Trash2 className="h-4 w-4" aria-hidden="true" />Clear saved deck</button>}
      </div>
    </div>
  );
}
