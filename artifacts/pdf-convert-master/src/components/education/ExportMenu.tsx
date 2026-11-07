import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Loader2 } from "lucide-react";
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
            className="edu-btn-ghost group">
            {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <a.icon className="h-4 w-4 text-[#8a837b] transition-colors group-hover:text-[#f7433d]" aria-hidden="true" />}{a.label}
          </button>
        ))}
      </div>
      {disabledReason && <p className="mt-2 text-sm text-[#9a5b0c]">{disabledReason}</p>}
      <div aria-live="polite" className="mt-2 min-h-5 text-sm">
        {ok && <span className="inline-flex items-center gap-1 text-[#2f5d50]" data-testid="text-export-ok"><Check className="h-4 w-4" aria-hidden="true" />{ok}</span>}
        {error && <span role="alert" className="text-[#8f1f1a]" data-testid="text-export-error">{error}</span>}
      </div>
    </div>
  );
}
