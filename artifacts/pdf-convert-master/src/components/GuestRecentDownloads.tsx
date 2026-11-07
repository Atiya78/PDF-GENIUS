import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

import { LoginRequiredDialog } from "@/components/LoginRequiredDialog";
import { downloadFromUrl } from "@/lib/download";
import {
  isGuest,
  loadGuestDownloads,
  type GuestDownload,
} from "@/lib/guestDownloads";

/**
 * Shows a guest's recently converted files with a Download button so they can
 * re-download after a page refresh / fresh load (logged-in users use their
 * dashboard history instead). Renders nothing for signed-in users or when there
 * are no persisted guest downloads.
 */
export function GuestRecentDownloads({
  toolType,
}: {
  toolType?: string;
}): JSX.Element | null {
  const [items, setItems] = useState<GuestDownload[]>([]);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  useEffect(() => {
    if (!isGuest()) return;
    const all = loadGuestDownloads();
    setItems(toolType ? all.filter((d) => d.toolType === toolType) : all);
  }, [toolType]);

  const onDownload = useCallback(async (d: GuestDownload) => {
    try {
      await downloadFromUrl(`/api/download/${d.jobId}`, d.fileName);
    } catch (err) {
      // A login-required failure is the actionable case: show the clear,
      // animated sign-in dialog instead of failing silently. Other errors
      // (e.g. the file expired from server storage) are surfaced by the
      // download helper itself.
      if (err instanceof Error && /log in/i.test(err.message)) {
        setLoginDialogOpen(true);
      }
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <>
    <div className="w-full max-w-4xl mx-auto mt-6 rounded-2xl border border-[#e7e0d5] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#1c1917] mb-3">Your recent files</p>
      <div className="space-y-2">
        {items.slice(0, 5).map((d) => (
          <div
            key={`${d.toolType}-${d.jobId}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#e7e0d5] bg-[#faf7f2] px-3 py-2"
          >
            <span className="truncate text-sm text-[#57534e]">{d.fileName}</span>
            <button
              type="button"
              onClick={() => onDownload(d)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f7433d] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#e23a34] transition-colors shrink-0"
              data-testid={`button-guest-redownload-${d.jobId}`}
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        ))}
      </div>
    </div>
    <LoginRequiredDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </>
  );
}

export default GuestRecentDownloads;
