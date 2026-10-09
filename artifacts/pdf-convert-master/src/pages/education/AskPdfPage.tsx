import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useExtractEducationPdf, generateEducationStarters, askEducationPdf } from "@workspace/api-client-react";
import type { EducationChatAnswer, EducationChatInput, EducationSourcePage } from "@workspace/api-client-react";
import { EducationToolLayout } from "@/components/education/EducationToolLayout";
import { UploadBox } from "@/components/education/UploadBox";
import { ChipGroup, LANGUAGE_OPTIONS } from "@/components/education/OptionControls";
import { GenerationProgress, type Phase } from "@/components/education/GenerationProgress";
import { GenerationError } from "@/components/education/GenerationError";
import { EducationHistory } from "@/components/education/EducationHistory";
import { PdfPagePreview, releaseStudyPdf } from "@/components/education/PdfPagePreview";
import { describeError } from "@/lib/education/errors";
import { useSourceInput } from "@/lib/education/useSource";
import { educationHeaders } from "@/lib/education/requests";
import { requestExport, copyText, slugify } from "@/lib/education/exportHelpers";
import { useAuth } from "@/contexts/AuthContext";

const MAX_TURNS = 100;
interface Session { id: string; file: File; pages: EducationSourcePage[] }
interface Turn { id: string; answer: EducationChatAnswer; sessionId: string | null }
interface Cite { turnId: string; pageNumber: number; quote: string }

export function AskPdfPage(): JSX.Element {
  const src = useSourceInput();
  const extract = useExtractEducationPdf();
  const { user, refreshUser } = useAuth();
  const owner = user?.id ?? "guest";
  const previousOwner = useRef(owner);
  const busy = useRef(false);
  const exporting = useRef(false);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [language, setLanguage] = useState<EducationChatInput["language"]>("same");
  const [phase, setPhase] = useState<Phase>("idle");
  const [starters, setStarters] = useState<string[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [cite, setCite] = useState<Cite | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const file = session?.file;
    return () => { if (file) releaseStudyPdf(file); };
  }, [session?.file]);

  const reset = () => {
    sessionRef.current = null; setSession(null); setTurns([]); setStarters([]); setQuestion(""); setCite(null);
    setError(null); setWarnings([]); setNote(null); pending.current = null; src.clear();
  };
  useEffect(() => {
    if (previousOwner.current !== owner) { previousOwner.current = owner; reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  const starting = phase !== "idle";
  const canStart = src.canSubmit && !starting && !!src.file;

  const start = async () => {
    if (busy.current || !canStart || !src.file) return;
    busy.current = true; setError(null); setWarnings([]);
    const caller = educationHeaders().Authorization;
    const file = src.file;
    try {
      setPhase("reading");
      const ex = await extract.mutateAsync({ data: { file, pageRange: src.normalized || undefined } });
      const pages = ex.pages.filter((p) => p.text.trim() && p.pageNumber !== null);
      if (pages.length === 0) throw new Error("No readable text was found in this PDF or page range.");
      if (educationHeaders().Authorization !== caller) return;
      const s: Session = { id: crypto.randomUUID(), file, pages };
      sessionRef.current = s; pending.current = null;
      setSession(s); setTurns([]); setCite(null); setWarnings(ex.warnings); setStarters([]); src.clear();
      setPhase("generating");
      try {
        const r = await generateEducationStarters({ pages, language }, { headers: educationHeaders() });
        if (sessionRef.current?.id === s.id) setStarters(r.questions);
      } catch {
        if (sessionRef.current?.id === s.id) setWarnings(previous => [...previous, "Starter questions are unavailable. You can still type your own question."]);
      }
    } catch (e) { setError(describeError(e)); }
    finally { setPhase("idle"); busy.current = false; }
  };

  const ask = async (raw: string) => {
    const q = raw.trim();
    const s = sessionRef.current;
    if (busy.current || !s || q.length < 2 || q.length > 2000 || turns.length >= MAX_TURNS) return;
    busy.current = true; setAsking(true); setError(null); setQuestion(q);
    const caller = educationHeaders().Authorization;
    const conversation = turns.filter((t) => t.sessionId === s.id).slice(-6).map((t) => ({ question: t.answer.question, answer: t.answer.answer }));
    const signature = JSON.stringify({ q, conversation, language, sid: s.id });
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    try {
      const a = await askEducationPdf({ pages: s.pages, language, question: q, conversation, requestId: pending.current.id }, { headers: educationHeaders() });
      if (educationHeaders().Authorization !== caller || sessionRef.current?.id !== s.id) return;
      pending.current = null;
      setTurns((p) => [...p, { id: crypto.randomUUID(), answer: a, sessionId: s.id }]);
      setQuestion(""); setRevision((v) => v + 1);
      void refreshUser();
    } catch (e) { setError(describeError(e)); }
    finally { setAsking(false); busy.current = false; }
  };

  const exportChat = async () => {
    if (exporting.current || turns.length === 0) return;
    exporting.current = true; setExportBusy(true); setNote(null);
    try {
      const title = (turns[0].answer.title || "PDF chat").slice(0, 200);
      await requestExport({ kind: "chat", format: "pdf", chat: { title, turns: turns.map((t) => t.answer) } }, `${slugify(title)}-chat.pdf`);
    } catch (e) { setNote(describeError(e)); }
    finally { exporting.current = false; setExportBusy(false); }
  };
  const copy = async (text: string) => { try { await copyText(text); setNote("Answer copied."); } catch (e) { setNote(describeError(e)); } };

  const options = session ? (
    <div className="space-y-3">
      <p className="text-sm text-gray-900"><span className="font-semibold">Session PDF:</span> {session.file.name} <span className="text-gray-500">({session.pages.length} pages with text)</span></p>
      <p className="text-xs text-gray-500">The PDF is kept in this tab's memory only. Resetting discards it and the chat.</p>
      {warnings.length > 0 && <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      <button type="button" disabled={asking} onClick={() => { if (turns.length === 0 || window.confirm("Reset the session? The PDF and this chat will be cleared.")) reset(); }} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Reset and start over</button>
    </div>
  ) : (
    <div className="space-y-5">
      <ChipGroup label="Answer language" testId="chip-language" disabled={starting} value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
      <button type="button" onClick={start} disabled={!canStart} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7433d] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#e03832] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" data-testid="button-start-chat">
        {starting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}{starting ? "Preparing..." : "Start chat session"}
      </button>
      {!src.file && !starting && <p className="text-xs text-gray-500">Upload a PDF to begin. Chat works with PDFs only.</p>}
      <GenerationProgress phase={phase} noun="starter questions" />
      <div aria-live="assertive"><GenerationError error={error} retry={start} disabled={!canStart} /></div>
    </div>
  );

  const latestSessionTurns = turns.filter((t) => t.sessionId === session?.id).length;
  return (
    <EducationToolLayout toolId="chat-with-pdf" seoTitle="Ask your PDF — Source-Grounded Answers with Page Citations | PDF Genius" seoDescription="Ask questions about your own lecture PDF and get answers with page citations and quotes. Preview the cited page and export the chat. Free daily allowance."
      upload={<UploadBox pdfOnly src={src} disabled={starting || !!session} />} options={options}
      result={<>
        {(session || turns.length > 0) && <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" data-testid="chat-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-['Poppins'] text-lg font-bold text-gray-900">Conversation</h2>
            <button type="button" disabled={exportBusy || turns.length === 0} onClick={exportChat} className="rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">{exportBusy ? "Preparing..." : "Export chat PDF"}</button>
          </div>
          {note && <p role="status" className="mb-3 text-sm text-gray-600">{note}</p>}
          {turns.length === 0 && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Ask anything the PDF should answer. Answers cite the pages they come from.</p>}
          <ol className="space-y-5">
            {turns.map((t) => <li key={t.id} className="space-y-2">
              <p className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-[#f7433d] px-4 py-2 text-sm text-white sm:max-w-[75%]">{t.answer.question}</p>
              <div className="max-w-full rounded-2xl rounded-bl-sm border border-gray-200 bg-gray-50 p-4 sm:max-w-[90%]">
                {!t.answer.found && <p className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Not found in the document</p>}
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">{t.answer.answer}</p>
                {t.answer.retrieval && <p className="mt-2 text-xs text-gray-500">PDF search: {t.answer.retrieval === "embeddings" ? "semantic matching" : "word matching (BM25)"}</p>}
                {t.answer.citations.length > 0 && <ul className="mt-3 space-y-2">
                  {t.answer.citations.map((c, i) => <li key={i} className="text-xs text-gray-600">
                    <button type="button" onClick={() => setCite(cite && cite.turnId === t.id && cite.pageNumber === c.pageNumber && cite.quote === c.quote ? null : { turnId: t.id, pageNumber: c.pageNumber, quote: c.quote })} className="mr-2 rounded-full bg-[#fff1f0] px-2 py-0.5 font-semibold text-[#d9322c] hover:bg-[#ffe0dd]" aria-expanded={cite?.turnId === t.id && cite.pageNumber === c.pageNumber && cite.quote === c.quote}>p.{c.pageNumber}</button>
                    <span className="italic">"{c.quote}"</span>
                  </li>)}
                </ul>}
                {cite?.turnId === t.id && <PdfPagePreview file={t.sessionId && t.sessionId === session?.id ? session.file : null} pageNumber={cite.pageNumber} quote={cite.quote} onClose={() => setCite(null)} />}
                <button type="button" onClick={() => copy(t.answer.answer)} className="mt-3 text-xs font-semibold text-[#d9322c] underline">Copy answer</button>
              </div>
            </li>)}
          </ol>
          {session && <div className="mt-5 space-y-3">
            {turns.length === 0 && starters.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
              {starters.map((s, i) => <button key={i} type="button" disabled={asking} onClick={() => { setQuestion(s); void ask(s); }} className="rounded-full border bg-white px-3 py-1.5 text-left text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">{s}</button>)}
            </div>}
            <form onSubmit={(e) => { e.preventDefault(); void ask(question); }} className="flex gap-2">
              <label htmlFor="chat-question" className="sr-only">Your question</label>
              <input id="chat-question" value={question} maxLength={2000} disabled={asking || turns.length >= MAX_TURNS} onChange={(e) => setQuestion(e.target.value)} placeholder={turns.length >= MAX_TURNS ? "Turn limit reached. Reset to continue." : "Ask about your PDF"} className="h-11 min-w-0 flex-1 rounded-full border border-gray-300 px-4 text-sm focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20" data-testid="input-question" />
              <button type="submit" disabled={asking || question.trim().length < 2 || turns.length >= MAX_TURNS} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f7433d] px-5 text-sm font-semibold text-white disabled:opacity-50" data-testid="button-ask">
                {asking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}Ask
              </button>
            </form>
            <p className="text-xs text-gray-500">{latestSessionTurns} of {MAX_TURNS} questions used. Each answered question uses one successful generation from your daily allowance.</p>
            <div aria-live="assertive"><GenerationError error={error} retry={() => ask(question)} disabled={asking || question.trim().length < 2} /></div>
          </div>}
        </div>}
        <EducationHistory kind="chat" revision={String(revision)} onOpen={(saved) => {
          if (!saved.chat) return;
          if (turns.length >= MAX_TURNS) { setNote("This chat is full. Reset to open more saved answers."); return; }
          setTurns((p) => [...p, { id: crypto.randomUUID(), answer: saved.chat!, sessionId: null }]); setCite(null); setError(null);
          setNote("Saved answer opened. Page previews need the original PDF: upload it and start a session.");
        }} />
      </>} />
  );
}
export default AskPdfPage;
