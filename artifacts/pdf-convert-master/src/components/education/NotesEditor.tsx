import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Bold, Code, Italic, List, Plus, Trash2 } from "lucide-react";
import type { EducationNotes } from "@workspace/api-client-react";
import { renderStudyMarkdown } from "@workspace/api-zod";
import { domToMarkdown } from "@/lib/education/notesMarkdown";

export interface NotesEditorHandle { snapshot: () => EducationNotes; }
type Sec = EducationNotes["sections"][number];

function Body({ section, register, disabled }: { section: Sec; disabled?: boolean; register: (id: string, el: HTMLDivElement | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) { ref.current.innerHTML = renderStudyMarkdown(section.body); register(section.id, ref.current); }
    return () => register(section.id, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);
  const exec = (cmd: string) => { if (disabled) return; ref.current?.focus(); document.execCommand(cmd); };
  const code = () => {
    const sel = window.getSelection();
    if (disabled || !sel || sel.rangeCount === 0 || sel.isCollapsed || !ref.current?.contains(sel.anchorNode)) return;
    const c = document.createElement("code"); c.textContent = sel.toString();
    const r = sel.getRangeAt(0); r.deleteContents(); r.insertNode(c);
  };
  const tb = "rounded-md border bg-white p-1.5 text-gray-700 hover:bg-gray-100";
  return <div>
    <div className="mb-1 flex gap-1" role="toolbar" aria-label="Text formatting">
      <button type="button" className={tb} aria-label="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}><Bold className="h-4 w-4" /></button>
      <button type="button" className={tb} aria-label="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}><Italic className="h-4 w-4" /></button>
      <button type="button" className={tb} aria-label="Bulleted list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></button>
      <button type="button" className={tb} aria-label="Inline code" onMouseDown={(e) => e.preventDefault()} onClick={code}><Code className="h-4 w-4" /></button>
    </div>
    <div ref={ref} contentEditable={!disabled} aria-disabled={disabled} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={`Section text: ${section.heading}`}
      onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      onDrop={(e) => { e.preventDefault(); if (!disabled) document.execCommand("insertText", false, e.dataTransfer.getData("text/plain")); }}
      className="min-h-[5rem] rounded-lg border border-gray-300 p-3 text-sm leading-relaxed text-gray-800 focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:ml-5 [&_ul]:list-disc" />
  </div>;
}

export const NotesEditor = forwardRef<NotesEditorHandle, { notes: EducationNotes; disabled?: boolean }>(function NotesEditor({ notes, disabled }, handle) {
  const [title, setTitle] = useState(notes.title);
  const [sections, setSections] = useState<Sec[]>(notes.sections);
  const [takeaways, setTakeaways] = useState<string[]>(notes.takeaways);
  const els = useRef(new Map<string, HTMLDivElement>());
  const latest = useRef({ title, sections, takeaways });
  latest.current = { title, sections, takeaways };
  const register = useRef((id: string, el: HTMLDivElement | null) => { if (el) els.current.set(id, el); else els.current.delete(id); }).current;

  const build = (): EducationNotes => {
    const { title: t, sections: ss, takeaways: ts } = latest.current;
    const secs = ss.map((s) => { const el = els.current.get(s.id); return { ...s, body: el ? domToMarkdown(el) : s.body }; });
    return { title: t.trim(), style: notes.style, sections: secs.map((s) => ({ ...s, heading: s.heading.trim() })), takeaways: ts.map((x) => x.trim()).filter(Boolean) };
  };
  useImperativeHandle(handle, () => ({
    snapshot: () => {
      const n = build();
      if (!n.title) throw new Error("Give the notes a title before exporting.");
      if (n.sections.length === 0) throw new Error("Keep at least one section.");
      const bad = n.sections.find((s) => !s.heading || !s.body);
      if (bad) throw new Error(`Section "${bad.heading || "untitled"}" needs a heading and some text.`);
      if (n.takeaways.length === 0) throw new Error("Keep at least one key takeaway.");
      setSections(n.sections);
      return n;
    },
  }));

  const field = "w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20";
  return <div className="space-y-5">
    <div><label htmlFor="notes-title" className="mb-1 block text-sm font-semibold text-gray-900">Title</label>
      <input id="notes-title" value={title} maxLength={200} disabled={disabled} onChange={(e) => setTitle(e.target.value)} className={`${field} h-11 font-['Poppins'] text-lg font-bold`} /></div>
    {sections.map((s, i) => <article key={s.id} className="rounded-xl border border-gray-200 bg-white p-4" data-testid={`notes-section-${i}`}>
      <div className="mb-3 flex items-center gap-2">
        <input aria-label={`Heading ${i + 1}`} value={s.heading} maxLength={200} disabled={disabled} onChange={(e) => setSections((p) => p.map((x) => x.id === s.id ? { ...x, heading: e.target.value } : x))} className={`${field} h-10 font-semibold`} />
        <button type="button" disabled={disabled || sections.length < 2} aria-label={`Delete section ${i + 1}`} onClick={() => { if (window.confirm("Delete this section?")) setSections(build().sections.filter((x) => x.id !== s.id)); }} className="rounded-lg border p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
      </div>
      <Body section={s} register={register} disabled={disabled} />
      {s.sourcePages.length > 0 && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">Source: {s.sourcePages.map((p) => <span key={p} className="rounded-full bg-[#fff1f0] px-2 py-0.5 font-semibold text-[#d9322c]">p.{p}</span>)}</p>}
    </article>)}
    <button type="button" disabled={disabled || sections.length >= 80} onClick={() => setSections([...build().sections, { id: crypto.randomUUID(), heading: "", body: "", sourcePages: [] }])} className="inline-flex items-center gap-1 rounded-full border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"><Plus className="h-4 w-4" />Add section</button>
    <div className="rounded-xl bg-[#fff7f6] p-4">
      <h3 className="font-['Poppins'] text-base font-bold text-gray-900">Key takeaways</h3>
      <ul className="mt-2 space-y-2">{takeaways.map((t, i) => <li key={i} className="flex gap-2">
        <input aria-label={`Takeaway ${i + 1}`} value={t} maxLength={2000} disabled={disabled} onChange={(e) => setTakeaways((p) => p.map((x, j) => j === i ? e.target.value : x))} className={`${field} h-10`} />
        <button type="button" disabled={disabled || takeaways.length < 2} aria-label={`Remove takeaway ${i + 1}`} onClick={() => setTakeaways((p) => p.filter((_, j) => j !== i))} className="rounded-lg border bg-white p-2 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
      </li>)}</ul>
      <button type="button" disabled={disabled || takeaways.length >= 20} onClick={() => setTakeaways((p) => [...p, ""])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#d9322c] disabled:opacity-50"><Plus className="h-4 w-4" />Add takeaway</button>
    </div>
  </div>;
});
