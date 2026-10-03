import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { EducationCard } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Mark } from "@/lib/education/storage";

const MAX = 100;
interface Draft { id: string | null; front: string; back: string }

export function FlashcardGrid({ cards, marks, onSave, onDelete }: { cards: EducationCard[]; marks: Record<string, Mark>; onSave: (d: { id: string | null; front: string; back: string }) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const valid = !!draft && draft.front.trim() !== "" && draft.back.trim() !== "";
  return (
    <div>
      <button type="button" onClick={() => setDraft({ id: null, front: "", back: "" })} disabled={cards.length >= MAX} className="mb-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#f7433d] px-5 text-sm font-semibold text-white hover:bg-[#e03832] disabled:opacity-50" data-testid="button-add-card"><Plus className="h-4 w-4" aria-hidden="true" />Add card</button>
      {cards.length === 0 && <p className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">No cards yet. Add your first card.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <li key={c.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-4" data-testid={`grid-card-${c.id}`}>
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500"><span>#{i + 1}{c.sourcePage ? ` · p.${c.sourcePage}` : ""}</span>{marks[c.id] && <span className={marks[c.id] === "know" ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>{marks[c.id] === "know" ? "Known" : "Learning"}</span>}</div>
            <p className="font-semibold text-gray-900">{c.front}</p>
            <p className="mt-1 flex-1 text-sm text-gray-600">{c.back}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setDraft({ id: c.id, front: c.front, back: c.back })} aria-label={`Edit card ${i + 1}`} className="rounded-lg border border-gray-200 p-2 hover:border-[#f7433d]" data-testid={`button-edit-${c.id}`}><Pencil className="h-4 w-4" /></button>
              {confirm === c.id ? (
                <><button type="button" onClick={() => { onDelete(c.id); setConfirm(null); }} className="rounded-lg bg-red-600 px-3 text-xs font-semibold text-white" data-testid={`button-confirm-delete-${c.id}`}>Confirm delete</button><button type="button" onClick={() => setConfirm(null)} className="px-2 text-xs text-gray-600">Cancel</button></>
              ) : <button type="button" onClick={() => setConfirm(c.id)} aria-label={`Delete card ${i + 1}`} className="rounded-lg border border-gray-200 p-2 hover:border-red-400 hover:text-red-600" data-testid={`button-delete-${c.id}`}><Trash2 className="h-4 w-4" /></button>}
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft?.id ? "Edit card" : "Add card"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold">Front<textarea value={draft.front} maxLength={3000} rows={3} onChange={(e) => setDraft({ ...draft, front: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm font-normal" data-testid="input-card-front" /></label>
              <label className="block text-sm font-semibold">Back<textarea value={draft.back} maxLength={3000} rows={3} onChange={(e) => setDraft({ ...draft, back: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm font-normal" data-testid="input-card-back" /></label>
            </div>
          )}
          <DialogFooter>
            <button type="button" onClick={() => setDraft(null)} className="h-10 rounded-full border border-gray-300 px-5 text-sm font-semibold">Cancel</button>
            <button type="button" disabled={!valid} onClick={() => { if (draft) { onSave(draft); setDraft(null); } }} className="h-10 rounded-full bg-[#f7433d] px-5 text-sm font-semibold text-white disabled:opacity-50" data-testid="button-save-card">Save card</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
