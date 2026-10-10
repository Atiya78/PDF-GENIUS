import { useEffect, useState } from "react";
import { Link } from "wouter";
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
  return <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
    <h2 className="text-lg font-semibold text-gray-900">Saved study history</h2>
    <p className="mt-1 text-sm text-gray-600">{user ? "Successful results are saved to your account for 24 hours. Reopen a result to study or export it." : <> <Link href="/signin" className="text-[#d9322c] underline">Sign in</Link> to save successful results to your account.</>}</p>
    {busy && <p role="status" className="mt-3 text-sm">Loading saved results…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {user && !busy && !error && !entries.length && <p className="mt-3 text-sm text-gray-500">No saved results from the last 24 hours.</p>}
    <ul className="mt-3 space-y-2">{entries.map(entry => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-3">
      <div className="min-w-0 flex-1"><p className="break-words font-medium">{entry.title}</p><time className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</time></div>
      <button type="button" disabled={busy} onClick={() => act(entry.id, false)} className="rounded-full border px-3 py-2 text-sm text-[#d9322c] disabled:opacity-50">Open</button>
      <button type="button" disabled={busy} onClick={() => act(entry.id, true)} className="rounded-full border px-3 py-2 text-sm disabled:opacity-50">Delete</button>
    </li>)}</ul>
  </section>;
}
