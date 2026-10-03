import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { describeError } from "@/lib/education/errors";

export interface ExportAction { id: string; label: string; icon: LucideIcon; run: () => Promise<void> | void }

export function ExportMenu({ actions, disabledReason, onExported }: { actions: ExportAction[]; disabledReason?: string | null; onExported?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const go = async (a: ExportAction) => {
    if (busy || disabledReason) return;
    setBusy(a.id); setError(null); setOk(null);
    try { await a.run(); setOk(`${a.label}: done`); onExported?.(); }
    catch (e) { setError(`${a.label} failed. ${describeError(e)}`); }
    finally { setBusy(null); }
  };
  return (
    <div data-testid="menu-export">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button key={a.id} type="button" onClick={() => go(a)} disabled={!!busy || !!disabledReason} data-testid={`button-export-${a.id}`}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition-colors hover:border-[#f7433d] hover:text-[#d9322c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d] disabled:cursor-not-allowed disabled:opacity-50">
            {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <a.icon className="h-4 w-4" aria-hidden="true" />}{a.label}
          </button>
        ))}
      </div>
      {disabledReason && <p className="mt-2 text-sm text-amber-700">{disabledReason}</p>}
      <div aria-live="polite" className="mt-2 min-h-5 text-sm">
        {ok && <span className="text-green-700" data-testid="text-export-ok">{ok}</span>}
        {error && <span role="alert" className="text-red-600" data-testid="text-export-error">{error}</span>}
      </div>
    </div>
  );
}
