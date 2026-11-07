import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authedJson } from "@/lib/authedFetch";

import { useLocation } from "wouter";
import { FileText, Settings, GitBranch, Wallet, Upload, ArrowRight, RefreshCw, Download, Trash2 } from "lucide-react";
import { DashSidebar } from "@/components/dashboard/DashSidebar";
import "@/styles/dashboard.css";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { useSeo } from "@/lib/useSeo";
import { downloadFromUrl } from "@/lib/download";
import { getOutputFormatByServerType, getToolConfigByServerType } from "@/lib/toolConfig";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { useToast } from "@/hooks/use-toast";

interface UsageData {
  totals: {
    total: number;
    completed: number;
    failed: number;
    apiCalls: number;
    webCalls: number;
    successRate: number;
    dataProcessed: number;
    activeKeys: number;
  };
  mostUsed: { type: string; name: string; count: number }[];
  recent: {
    id: number;
    toolType: string;
    toolName: string;
    inputFilename: string;
    outputFilename: string | null;
    status: string;
    source: string;
    createdAt: string | null;
  }[];
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function timeAgo(value: string | null): string {
  if (!value) return "";
  const d = new Date(value).getTime();
  if (isNaN(d)) return "";
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const ActivityItem: React.FC<{
  title: string;
  fileType: string;
  time: string;
  status: string;
  toolType: string;
  toolName: string;
  canDownload?: boolean;
  downloading?: boolean;
  onDownload?: () => void;
  deleting?: boolean;
  onDelete?: () => void;
}> = ({ title, fileType, time, status, toolType, toolName, canDownload, downloading, onDownload, deleting, onDelete }) => {
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const cfg = getToolConfigByServerType(toolType);
  const chip = isFailed ? "is-bad" : isCompleted ? "is-ok" : "";
  const chipLabel = isFailed ? "Failed" : isCompleted ? fileType : status;

  return (
    <li className="dash-row flex items-center gap-3 border-b border-[var(--desk-line)] py-3.5 pl-3 sm:gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] border border-[var(--desk-line)] bg-[var(--desk-sheet)]">
        {cfg
          ? <ToolLottieIcon toolId={cfg.id} config={cfg} size={28} loop={false} />
          : <FileText className="h-4 w-4 text-[var(--desk-ink-3)]" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-[var(--desk-ink)]">{title}</p>
        <p className="mt-0.5 truncate text-[13px] text-[#6f6860]">{toolName}<span className="mx-1.5 text-[var(--desk-line)]">/</span><span className="edu-mono">{time}</span></p>
      </div>
      <span className={`dash-chip hidden sm:inline-flex ${chip}`}>{chipLabel}</span>
      <div className="flex shrink-0 items-center gap-1.5 pr-1">
        {canDownload && (
          <button type="button" className="dash-icon-btn" onClick={onDownload} disabled={downloading} aria-label="Download file again" title="Download again" data-testid="download-activity">
            {downloading ? <ProcessingSpinner size={16} /> : <Download className="h-4 w-4" />}
          </button>
        )}
        {onDelete && (
          <button type="button" className="dash-icon-btn is-danger" onClick={onDelete} disabled={deleting} aria-label="Delete file" title="Delete file" data-testid="delete-activity">
            {deleting ? <ProcessingSpinner size={16} /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
      </div>
    </li>
  );
};

export const Dashboard: React.FC = () => {
  useSeo({ title: "Dashboard", canonicalPath: "/dashboard", noindex: true });
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  // Re-download a past conversion straight from Recent Activity. The bytes are
  // fetched fresh from the backend's durable object storage, so this works
  // anytime — long after the original conversion.
  const handleDownload = async (job: UsageData["recent"][number]) => {
    if (downloadingId !== null) return;
    const name =
      job.outputFilename ||
      `${job.toolName.replace(/\s+/g, "-").toLowerCase()}-${job.id}`;
    setDownloadingId(job.id);
    try {
      await downloadFromUrl(`/api/download/${job.id}`, name);
    } catch (err) {
      toast({
        title: "Download failed",
        description:
          err instanceof Error ? err.message : "We couldn't download this file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Permanently delete a past conversion — removes the durable stored copy
  // (Backblaze) and the job record so the file isn't kept forever, then drops it
  // from the activity list.
  const handleDelete = async (job: UsageData["recent"][number]) => {
    if (deletingId !== null) return;
    if (!window.confirm("Delete this file? This permanently removes the file and its download.")) {
      return;
    }
    setDeletingId(job.id);
    try {
      await authedJson(`/api/download/${job.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
    } catch (err) {
      toast({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "We couldn't delete this file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const { data: usage, isLoading, isError, refetch, isFetching } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    queryFn: () => authedJson<{ data: UsageData }>("/api/usage").then((r) => r.data),
  });

  const totals = usage?.totals;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const displayName = user?.email ? user.email.split("@")[0] : "there";

  const stats = [
    { label: "Files converted", value: (totals?.total ?? 0).toLocaleString(), sub: `${(totals?.completed ?? 0).toLocaleString()} completed`, testId: "stat-files" },
    { label: "API calls", value: (totals?.apiCalls ?? 0).toLocaleString(), sub: `${(totals?.webCalls ?? 0).toLocaleString()} from the web app`, testId: "stat-api-calls" },
    { label: "Data processed", value: formatBytes(totals?.dataProcessed ?? 0), sub: "Total output size", testId: "stat-data" },
    { label: "Active API keys", value: (totals?.activeKeys ?? 0).toLocaleString(), sub: `${totals?.successRate ?? 0}% success rate`, testId: "stat-keys" },
  ];

  return (
    <div className="dash-root min-h-[100dvh]">
      <div className="flex flex-col lg:flex-row">
        <DashSidebar />

        <main className="min-w-0 flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-10 lg:pt-10">
          <div className="mx-auto max-w-6xl">
            <header className="dash-head flex flex-col gap-6 pb-8 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="edu-eyebrow">{today}</p>
                <h1 className="dash-h1 mt-3 truncate" data-testid="text-welcome">Welcome back, {displayName}</h1>
                <p className="dash-lede mt-2">You are on the <span className="font-semibold capitalize text-[var(--desk-ink)]">{user?.plan || "Free"}</span> plan.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="edu-btn-primary !h-11 !px-5" onClick={() => handleNavigation('/dashboard/live-tools')} data-testid="button-upload-new">
                  <Upload className="h-4 w-4" aria-hidden="true" /> Upload new PDF
                </button>
                <button type="button" className="edu-btn-ghost !min-h-[44px]" onClick={() => handleNavigation('/tools')} data-testid="button-view-all-tools">
                  View all tools
                </button>
              </div>
            </header>

            {isError ? (
              <div className="mt-8 flex flex-col gap-4 rounded-[14px] border border-[#f6c4c0] bg-[var(--desk-coral-wash)] p-5 sm:flex-row sm:items-center sm:justify-between" role="alert" data-testid="error-usage">
                <div>
                  <p className="font-semibold text-[var(--desk-ink)]">We couldn't load your usage.</p>
                  <p className="mt-1 text-sm text-[var(--desk-ink-2)]">Your files and keys are safe. Check your connection and try again.</p>
                </div>
                <button type="button" className="edu-btn-ghost" onClick={() => refetch()} disabled={isFetching} data-testid="button-retry-usage">
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" /> Retry
                </button>
              </div>
            ) : (
              <section className="mt-8" aria-label="Summary">
                <div className="dash-ledger">
                  {stats.map((s) => (
                    <div key={s.label} className="px-1 py-5 sm:px-5 lg:first:pl-1" data-testid={s.testId}>
                      <p className="edu-eyebrow !text-[var(--desk-ink-3)]">{s.label}</p>
                      {isLoading ? (
                        <><div className="dash-skel mt-3 h-8 w-24" /><div className="dash-skel mt-2 h-3.5 w-32" /></>
                      ) : (
                        <><p className="dash-figure mt-2.5">{s.value}</p><p className="mt-1.5 text-[13px] text-[#6f6860]">{s.sub}</p></>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-14 grid gap-14 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12">
              {/* Recent activity */}
              <section aria-labelledby="recent-heading">
                <div className="flex items-end justify-between gap-4 border-b border-[var(--desk-ink)] pb-3">
                  <div>
                    <p className="edu-eyebrow">Ledger</p>
                    <h2 id="recent-heading" className="mt-1.5 text-xl font-semibold text-[var(--desk-ink)]">Recent activity</h2>
                  </div>
                  <button type="button" className="dash-link" onClick={() => handleNavigation('/dashboard/usage')} data-testid="button-full-history">Full history <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </div>
                {isLoading ? (
                  <ul aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i} className="flex items-center gap-4 border-b border-[var(--desk-line)] py-4">
                        <div className="dash-skel h-10 w-10" /><div className="flex-1"><div className="dash-skel h-4 w-2/3" /><div className="dash-skel mt-2 h-3 w-24" /></div>
                      </li>
                    ))}
                  </ul>
                ) : usage && usage.recent.length === 0 ? (
                  <div className="border-b border-[var(--desk-line)] py-12" data-testid="empty-activity">
                    <p className="font-['Poppins'] text-lg font-semibold text-[var(--desk-ink)]">No recent activity yet.</p>
                    <p className="mt-1 max-w-md text-sm text-[var(--desk-ink-2)]">Every file you convert while signed in is listed here, ready to download again or delete.</p>
                    <button type="button" className="dash-link mt-4" onClick={() => handleNavigation('/dashboard/live-tools')}>Convert your first file <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </div>
                ) : (
                  <ul>
                    {(usage?.recent ?? []).map((item) => (
                      <ActivityItem
                        key={item.id}
                        title={`${item.outputFilename || item.inputFilename}${item.source === "api" ? " (API)" : ""}`}
                        fileType={getOutputFormatByServerType(item.toolType) ?? "File"}
                        toolType={item.toolType}
                        toolName={item.toolName}
                        time={timeAgo(item.createdAt)}
                        status={item.status}
                        canDownload={item.status === "completed"}
                        downloading={downloadingId === item.id}
                        onDownload={() => handleDownload(item)}
                        deleting={deletingId === item.id}
                        onDelete={() => handleDelete(item)}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* Most used tools */}
              <section aria-labelledby="mostused-heading">
                <div className="flex items-end justify-between gap-4 border-b border-[var(--desk-ink)] pb-3">
                  <div>
                    <p className="edu-eyebrow">Habits</p>
                    <h2 id="mostused-heading" className="mt-1.5 text-xl font-semibold text-[var(--desk-ink)]">Most used tools</h2>
                  </div>
                  <button type="button" className="dash-link" onClick={() => handleNavigation('/tools')} data-testid="button-mostused-all">All tools <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </div>
                {isLoading ? (
                  <div className="space-y-3 pt-4" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="dash-skel h-12" />)}</div>
                ) : usage && usage.mostUsed.length === 0 ? (
                  <p className="py-8 text-sm text-[var(--desk-ink-2)]" data-testid="empty-mostused">No conversions yet. Start converting to see your most-used tools here.</p>
                ) : (
                  <ol>
                    {(usage?.mostUsed ?? []).map((tool, i) => {
                      const cfg = getToolConfigByServerType(tool.type);
                      return (
                        <li key={tool.type} className="dash-row flex items-center gap-3 border-b border-[var(--desk-line)] py-3 pl-3" data-testid={`tool-${tool.type}`}>
                          <span className="edu-mono w-5 text-xs text-[var(--desk-ink-3)]">{String(i + 1).padStart(2, "0")}</span>
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[var(--desk-line)] bg-[var(--desk-sheet)]">
                            {cfg ? <ToolLottieIcon toolId={cfg.id} config={cfg} size={24} loop={false} /> : <FileText className="h-4 w-4 text-[var(--desk-ink-3)]" aria-hidden="true" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--desk-ink)]">{tool.name}</span>
                          <span className="edu-mono pr-1 text-sm text-[var(--desk-ink-2)]">{tool.count}<span className="ml-1 text-xs text-[var(--desk-ink-3)]">{tool.count === 1 ? "use" : "uses"}</span></span>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <div className="mt-10 rounded-[14px] border border-[var(--desk-line)] bg-[var(--desk-sheet)] p-5">
                  <p className="edu-eyebrow !text-[var(--desk-ink-3)]">Shortcuts</p>
                  <ul className="mt-3 divide-y divide-[var(--desk-line)]">
                    {[
                      { label: "Create an API key", href: "/dashboard/api-setup", icon: Settings },
                      { label: "Top up credits", href: "/dashboard/buy-credits", icon: Wallet },
                      { label: "Compare plans", href: "/dashboard/manage-plans", icon: GitBranch },
                    ].map(({ label, href, icon: Icon }) => (
                      <li key={href}>
                        <button type="button" onClick={() => handleNavigation(href)} className="group flex min-h-[44px] w-full items-center gap-3 py-2 text-left text-sm font-semibold text-[var(--desk-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--desk-ink)]">
                          <Icon className="h-4 w-4 text-[var(--desk-ink-3)] transition-colors group-hover:text-[var(--desk-coral-deep)]" aria-hidden="true" />
                          {label}
                          <ArrowRight className="ml-auto h-4 w-4 text-[var(--desk-ink-3)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--desk-ink)]" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
