import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useExtractEducationPdf, generateEducationFlashcards } from "@workspace/api-client-react";
import type { EducationDeck, EducationFlashcardInput } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { ChipGroup, CountInput, LANGUAGE_OPTIONS } from "@/components/education/OptionControls";
import { GenerationProgress, type Phase } from "@/components/education/GenerationProgress";
import { FlashcardWorkspace } from "@/components/education/FlashcardWorkspace";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { useTrack } from "@/lib/education/useTrack";
import { clearSavedDeck, loadSavedDeck, saveDeck, type Mark } from "@/lib/education/storage";
import { useAuth } from "@/contexts/AuthContext";
import { GenerationError } from "@/components/education/GenerationError";
import { EducationHistory } from "@/components/education/EducationHistory";
import { educationHeaders, requestIdentity } from "@/lib/education/requests";

export function FlashcardsPage(): JSX.Element {
  const src = useSourceInput();
  const track = useTrack("flashcards");
  const extract = useExtractEducationPdf();
  const { user, loading, refreshUser } = useAuth();
  const owner = user?.id ?? "guest";
  const request = useRef<{ signature: string; id: string } | null>(null);
  const [count, setCount] = useState<EducationFlashcardInput["count"]>(20);
  const [style, setStyle] = useState<EducationFlashcardInput["style"]>("term-definition");
  const [language, setLanguage] = useState<EducationFlashcardInput["language"]>("same");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [deck, setDeck] = useState<EducationDeck | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (loading || hydratedOwner === owner) return;
    if (hydratedOwner !== null) { src.clear(); setError(null); setWarnings([]); request.current = null; }
    const s = loadSavedDeck(owner);
    setDeck(s?.deck ?? null); setMarks(s?.marks ?? {}); setOrder(s?.order ?? []);
    setRestored(!!s); setSaveFailed(false); setHydratedOwner(owner);
  }, [owner, loading, hydratedOwner, src.clear]);
  useEffect(() => {
    if (hydratedOwner !== owner || !deck) return;
    setSaveFailed(!saveDeck({ v: 1, deck, marks, order, savedAt: Date.now() }, owner));
  }, [hydratedOwner, owner, deck, marks, order]);

  const running = phase !== "idle";
  const can = src.canSubmit && Number.isInteger(count) && count >= 10 && count <= 100 && !running && !loading;

  const run = async () => {
    if (busy.current || !can) return;
    busy.current = true; setError(null); setWarnings([]);
    const caller = educationHeaders().Authorization;
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
      const input = { pages, count, style, language };
      const d = await generateEducationFlashcards({ ...input, requestId: requestIdentity(request, input) }, { headers: educationHeaders() });
      pages = [];
      if (educationHeaders().Authorization !== caller) return;
      request.current = null;
      track("generate"); setDeck(d); setMarks({}); setOrder([]); setRestored(false); src.clear();
      void refreshUser();
    } catch (e) { setError(describeError(e)); }
    finally { setPhase("idle"); busy.current = false; }
  };

  const onClear = useCallback(() => { clearSavedDeck(owner); setDeck(null); setMarks({}); setOrder([]); setRestored(false); setSaveFailed(false); }, [owner]);

  const options = (
    <div className="space-y-5">
      {restored && deck && <p className="rounded-lg bg-[#fff1f0] p-3 text-sm text-gray-800" data-testid="text-restored">Restored your saved deck from this browser. Generating a new deck replaces it.</p>}
      <CountInput label="Number of cards" min={10} max={100} disabled={running} value={count} onChange={setCount} />
      <ChipGroup label="Card style" testId="chip-style" disabled={running} value={style} onChange={setStyle} options={[{ value: "term-definition", label: "Basic (term → definition)" }, { value: "question-answer", label: "Q&A" }, { value: "cloze", label: "Cloze (fill-in)" }] as const} />
      <ChipGroup label="Language" testId="chip-language" disabled={running} value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
      <button type="button" onClick={run} disabled={!can} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#e03832] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" data-testid="button-generate-cards">
        {running ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}{running ? "Generating..." : "Generate Flashcards"}
      </button>
      {!src.canSubmit && !running && <p className="text-xs text-gray-500">Add a PDF or paste some text to continue.</p>}
      <GenerationProgress phase={phase} noun="cards" skipReading={src.mode === "paste"} />
      <div aria-live="assertive">
        <GenerationError error={error} retry={run} disabled={!can} />
      </div>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800" data-testid="list-warnings">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    </div>
  );

  return (
    <EducationToolLayout toolId="flashcards" seoTitle="PDF to Flashcards — Free AI Flashcard Maker | PDF Genius" seoDescription="Make flip flashcards from a lecture PDF or pasted notes. Study with shuffle and progress, then export printable cards, CSV or Anki. Free."
      upload={<UploadBox src={src} disabled={running} />} options={options}
      result={<>
        {deck && <><button type="button" disabled={running} onClick={() => { onClear(); src.clear(); setError(null); setWarnings([]); request.current = null; }} className="mb-3 rounded-full border bg-white px-4 py-2 text-sm font-semibold">Start over</button>
          <FlashcardWorkspace key={deck.cards[0]?.id} deck={deck} marks={marks} order={order} saveFailed={saveFailed} onDeck={setDeck} onMarks={setMarks} onOrder={setOrder} onClear={onClear} onExported={() => track("export")} /></>}
        <EducationHistory kind="flashcards" revision={deck?.cards[0]?.id} onOpen={saved => { if (saved.deck) { setDeck(saved.deck); setMarks({}); setOrder([]); setRestored(false); src.clear(); setError(null); } }} />
      </>} />
  );
}
export default FlashcardsPage;
