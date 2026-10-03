import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useExtractEducationPdf, useGenerateEducationFlashcards } from "@workspace/api-client-react";
import type { EducationDeck, EducationFlashcardInput } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { ChipGroup, LANGUAGE_OPTIONS } from "@/components/education/OptionControls";
import { GenerationProgress, type Phase } from "@/components/education/GenerationProgress";
import { FlashcardWorkspace } from "@/components/education/FlashcardWorkspace";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { useTrack } from "@/lib/education/useTrack";
import { clearSavedDeck, loadSavedDeck, saveDeck, type Mark } from "@/lib/education/storage";

export function FlashcardsPage(): JSX.Element {
  const src = useSourceInput();
  const track = useTrack("flashcards");
  const extract = useExtractEducationPdf();
  const generate = useGenerateEducationFlashcards();
  const [count, setCount] = useState<EducationFlashcardInput["count"]>(20);
  const [style, setStyle] = useState<EducationFlashcardInput["style"]>("term-definition");
  const [language, setLanguage] = useState<EducationFlashcardInput["language"]>("same");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [deck, setDeck] = useState<EducationDeck | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const s = loadSavedDeck();
    if (s) { setDeck(s.deck); setMarks(s.marks); setOrder(s.order); setRestored(true); }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated || !deck) return;
    setSaveFailed(!saveDeck({ v: 1, deck, marks, order, savedAt: Date.now() }));
  }, [hydrated, deck, marks, order]);

  const running = phase !== "idle";
  const can = src.canSubmit && !running;

  const run = async () => {
    if (busy.current || !can) return;
    busy.current = true; setError(null); setWarnings([]);
    try {
      let pages: { pageNumber: number | null; text: string }[];
      if (src.mode === "upload" && src.file) {
        setPhase("reading");
        const ex = await extract.mutateAsync({ data: { file: src.file, pageRange: src.normalized || undefined } });
        track("upload"); setWarnings(ex.warnings);
        pages = ex.pages.filter((p) => p.text.trim());
        if (pages.length === 0) throw new Error("No readable text was found in this PDF or page range.");
      } else pages = [{ pageNumber: null, text: src.text.trim() }];
      setPhase("generating");
      const d = await generate.mutateAsync({ data: { pages, count, style, language } });
      pages = [];
      track("generate"); setDeck(d); setMarks({}); setOrder([]); setRestored(false); src.clear();
    } catch (e) { setError(describeError(e)); }
    finally { setPhase("idle"); busy.current = false; }
  };

  const onClear = useCallback(() => { clearSavedDeck(); setDeck(null); setMarks({}); setOrder([]); setRestored(false); setSaveFailed(false); }, []);

  const options = (
    <div className="space-y-5">
      {restored && deck && <p className="rounded-lg bg-[#fff1f0] p-3 text-sm text-gray-800" data-testid="text-restored">Restored your saved deck from this browser. Generating a new deck replaces it.</p>}
      <ChipGroup label="Number of cards" testId="chip-count" disabled={running} value={count} onChange={setCount} options={([10, 20, 40, 60] as const).map(n => ({ value: n, label: String(n) }))} />
      <ChipGroup label="Card style" testId="chip-style" disabled={running} value={style} onChange={setStyle} options={[{ value: "term-definition", label: "Term \u2192 Definition" }, { value: "question-answer", label: "Question \u2192 Answer" }, { value: "concept-explanation", label: "Concept \u2192 Explanation" }] as const} />
      <ChipGroup label="Language" testId="chip-language" disabled={running} value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
      <button type="button" onClick={run} disabled={!can} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#e03832] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" data-testid="button-generate-cards">
        {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}{running ? "Generating..." : "Generate Flashcards"}
      </button>
      {!src.canSubmit && !running && <p className="text-xs text-gray-500">Add a PDF or paste some text to continue.</p>}
      <GenerationProgress phase={phase} noun="cards" skipReading={src.mode === "paste"} />
      <div aria-live="assertive">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700" data-testid="text-generate-error">{error}</p>}
      </div>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800" data-testid="list-warnings">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    </div>
  );

  return (
    <EducationToolLayout toolId="flashcards" seoTitle="PDF to Flashcards — Free AI Flashcard Maker | PDF Genius" seoDescription="Make flip flashcards from a lecture PDF or pasted notes. Study with shuffle and progress, then export printable cards, CSV or Anki. Free."
      upload={<UploadBox src={src} disabled={running} />} options={options}
      result={deck && <FlashcardWorkspace deck={deck} marks={marks} order={order} saveFailed={saveFailed} onDeck={setDeck} onMarks={setMarks} onOrder={setOrder} onClear={onClear} onExported={() => track("export")} />} />
  );
}
export default FlashcardsPage;
