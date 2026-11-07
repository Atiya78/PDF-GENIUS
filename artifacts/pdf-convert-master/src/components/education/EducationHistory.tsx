import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Clock3, Trash2 } from "lucide-react";
import { listEducationHistory, getEducationHistory, deleteEducationHistory, type EducationHistoryEntry, type EducationSavedResult } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { educationHeaders } from "@/lib/education/requests";
import { describeError } from "@/lib/education/errors";

export function EducationHistory({ kind, revision, onOpen }: {
  kind: "quiz" | "flashcards" | "chat" | "notes" | "summary" | "mindmap" | "translation" | "exam"; revision?: string; onOpen: (result: EducationSavedResult) => void;
}) {
  const { user, token } = useAuth();
  const [entries, setEntries] = useState<EducationHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setEntries([]); setError(null);
    if (user && token) {
      setBusy(true);
      listEducationHistory({ headers: educationHeaders() }).then(rows => {
        if (active) setEntries(rows.filter(row => row.kind === kind));
      }).catch(failure => { if (active) setError(describeError(failure)); })
        .finally(() => { if (active) setBusy(false); });
    } else setBusy(false);
    return () => { active = false; };
  }, [user?.id, token, kind, revision, refresh]);
  const act = async (id: string, remove: boolean) => {
    if (busy || (remove && !window.confirm("Delete this saved study result? This cannot be undone."))) return;
    const owner = user?.id;
    setBusy(true); setError(null);
    try {
      if (remove) {
        await deleteEducationHistory(id, { headers: educationHeaders() });
        setRefresh(value => value + 1);
      } else {
        const saved = await getEducationHistory(id, { headers: educationHeaders() });
        // A sign-out during the request must not restore another user's result.
        if (educationHeaders().Authorization === `Bearer ${token}` && owner === user?.id) onOpen(saved);
      }
    } catch (failure) { setError(describeError(failure)); }
    finally { setBusy(false); }
  };
  return <section className="mt-8 border-t border-[#e7e0d5] pt-6" aria-labelledby={`history-${kind}`}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={`history-${kind}`} className="flex items-center gap-2 font-['Poppins'] text-lg font-semibold text-[#1c1917]"><Clock3 className="h-4 w-4 text-[#f7433d]" aria-hidden="true" />Saved study history</h2>
      <p className="edu-eyebrow !text-[#8a837b]">Last 24 hours</p>
    </div>
    <p className="mt-1 max-w-2xl text-sm text-[#57534e]">{user ? "Successful results are saved to your account for 24 hours. Reopen a result to study or export it." : <><Link href="/signin" className="font-semibold text-[#c8302a] underline underline-offset-2">Sign in</Link> to save successful results to your account.</>}</p>
    {busy && <div role="status" className="mt-4 space-y-2" aria-label="Loading saved results"><div className="h-14 animate-pulse rounded-[10px] bg-[#f1ebe2]" /><div className="h-14 animate-pulse rounded-[10px] bg-[#f1ebe2] opacity-60" /></div>}
    {error && <p role="alert" className="mt-3 text-sm text-[#8f1f1a]">{error}</p>}
    {user && !busy && !error && !entries.length && <p className="mt-4 rounded-[10px] border border-dashed border-[#d9d0c3] px-4 py-5 text-sm text-[#8a837b]">No saved results from the last 24 hours. Your next successful result will appear here.</p>}
    {entries.length > 0 && <ul className="mt-4 divide-y divide-[#efe8dd] overflow-hidden rounded-[12px] border border-[#e7e0d5] bg-[#fffdf9]">{entries.map(entry => <li key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-white">
      <div className="min-w-0 flex-1"><p className="break-words font-medium text-[#1c1917]">{entry.title}</p><time className="edu-mono text-xs text-[#8a837b]">{new Date(entry.createdAt).toLocaleString()}</time></div>
      <button type="button" disabled={busy} onClick={() => act(entry.id, false)} className="edu-btn-ghost !min-h-9 text-[#c8302a]">Open</button>
      <button type="button" disabled={busy} onClick={() => act(entry.id, true)} aria-label={`Delete ${entry.title}`} className="edu-btn-ghost !min-h-9 !px-2.5"><Trash2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Delete</span></button>
    </li>)}</ul>}
  </section>;
}
