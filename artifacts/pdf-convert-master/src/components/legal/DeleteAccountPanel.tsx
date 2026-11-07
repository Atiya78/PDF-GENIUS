import { useState } from "react";
import { Link, useLocation } from "wouter";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/** Permanently delete the signed-in account (DELETE /api/auth/account). Typed confirmation required. */
export function DeleteAccountPanel({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, token, signout, user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="legal-note !mt-0 mb-10" data-testid="panel-delete-signed-out">
        <Link href="/signin" className="legal-a">Sign in</Link> to delete your account from this page, or email{" "}
        <a href="mailto:privacy@pdfgenius.app" className="legal-a">privacy@pdfgenius.app</a> if you can no longer sign in.
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm !== "DELETE") return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/account`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.error || `Deletion failed (${res.status}).`);
      signout();
      setLocation("/?account=deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed.");
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="delete-account-heading"
      className={`${compact ? "" : "mb-12"} rounded-[10px] border border-[#f3c4c0] bg-[#fffdf9] p-5 sm:p-6`}
      data-testid="panel-delete-account"
    >
      <h2 id="delete-account-heading" className="flex items-center gap-2 font-['Poppins'] text-lg font-semibold text-[#1c1917]">
        <AlertTriangle className="h-5 w-5 text-[#c8302a]" aria-hidden="true" /> Delete account
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">
        Permanently delete <strong className="text-[#1c1917]">{user?.email}</strong>, your history, stored files and both credit wallets. This cannot be undone. Cancel any active subscription first.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex min-h-11 items-center rounded-[9px] border border-[#c8302a] px-4 text-sm font-semibold text-[#c8302a] transition-colors hover:bg-[#c8302a] hover:text-white" data-testid="button-delete-account-start">
          Delete my account
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label htmlFor="delete-confirm" className="block text-sm font-medium text-[#1c1917]">Type <span className="edu-mono">DELETE</span> to confirm</label>
          <input
            id="delete-confirm" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="h-11 w-full max-w-xs rounded-[9px] border border-[#e7e0d5] bg-white px-3 text-[15px] outline-none focus:border-[#1c1917] focus:ring-2 focus:ring-[#f7433d]/30"
            data-testid="input-delete-confirm"
          />
          {error && <p role="alert" className="max-w-xl rounded-[9px] border border-[#f3c4c0] bg-[#fdf1ef] p-3 text-sm text-[#8f1f1a]" data-testid="text-delete-error">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={confirm !== "DELETE" || busy} className="inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-[#c8302a] px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-40" data-testid="button-delete-account-confirm">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Delete permanently
            </button>
            <button type="button" onClick={() => { setOpen(false); setConfirm(""); setError(null); }} className="min-h-11 px-3 text-sm font-semibold text-[#57534e] hover:text-[#1c1917]">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
