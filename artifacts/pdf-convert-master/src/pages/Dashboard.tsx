import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authedJson } from "@/lib/authedFetch";

import { useLocation } from "wouter";
import { Search, FileText, Activity, Link as LinkIcon, Home, BarChart3, Settings, Book, GitBranch, Wrench, Wallet, Upload, Clock, ArrowUp, ArrowDown, Check, X, RefreshCw, Download, Trash2, HelpCircle } from "lucide-react";
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

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, iconBg }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

const ActivityItem: React.FC<{
  title: string;
  fileType: string;
  time: string;
  status: string;
  toolType: string;
  canDownload?: boolean;
  downloading?: boolean;
  onDownload?: () => void;
  deleting?: boolean;
  onDelete?: () => void;
}> = ({ title, fileType, time, status, toolType, canDownload, downloading, onDownload, deleting, onDelete }) => {
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const cfg = getToolConfigByServerType(toolType);
  const iconWrap = cfg
    ? `${cfg.iconBgColor} border ${cfg.iconBorderColor}`
    : "bg-gray-100 border border-gray-200";
  const badge = isFailed ? "bg-red-100 text-red-800" : isCompleted ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-800";
  const badgeLabel = isFailed ? "Failed" : isCompleted ? fileType : status;

  return (
    <div className="flex items-center p-3 rounded-lg">
      <div className={`w-10 h-10 rounded-lg ${iconWrap} flex items-center justify-center mr-4 shrink-0`}>
        {cfg
          ? <ToolLottieIcon toolId={cfg.id} config={cfg} size={28} loop={false} />
          : <FileText className="w-4 h-4 text-gray-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-gray-900 truncate">{title}</p>
        <p className="text-sm text-gray-500">{time}</p>
      </div>
      <div className="text-right ml-4 shrink-0 flex items-center gap-3">
        <div>
          <Badge className={`text-xs ${badge}`}>{badgeLabel}</Badge>
        </div>
        {canDownload && (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={onDownload}
            disabled={downloading}
            aria-label="Download file again"
            title="Download again"
            data-testid={`download-activity`}
          >
            {downloading
              ? <ProcessingSpinner size={16} />
              : <Download className="w-4 h-4" />}
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 text-gray-500 hover:text-red-600"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete file"
            title="Delete file"
            data-testid="delete-activity"
          >
            {deleting
              ? <ProcessingSpinner size={16} />
              : <Trash2 className="w-4 h-4" />}
          </Button>
        )}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  useSeo({ title: "Dashboard", canonicalPath: "/dashboard", noindex: true });
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
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

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    queryFn: () => authedJson<{ data: UsageData }>("/api/usage").then((r) => r.data),
  });

  const totals = usage?.totals;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const displayName = user?.email ? user.email.split("@")[0] : "there";

  return (
      <div className="min-h-screen bg-gray-50">

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:min-h-screen">
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search tools..." className="pl-10" />
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              <Button className="w-full justify-start p-3 rounded-lg shadow-md">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mr-3">
                  <Home className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">Home</p>
                  <p className="text-xs text-blue-100">Dashboard overview</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start p-3"
                onClick={() => handleNavigation('/dashboard/usage')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-700">Total Usage</p>
                  <p className="text-xs text-gray-500">Usage statistics</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start p-3"
                onClick={() => handleNavigation('/dashboard/api-setup')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-700">API Setup</p>
                  <p className="text-xs text-gray-500">Integration guides</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start p-3"
                onClick={() => handleNavigation('/dashboard/api-reference')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <Book className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-700">API Reference</p>
                  <p className="text-xs text-gray-500">Documentation</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start p-3"
                onClick={() => handleNavigation('/dashboard/manage-plans')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <GitBranch className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-700">View Plans</p>
                  <p className="text-xs text-gray-500">Pricing and upgrades</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start p-3"
                onClick={() => handleNavigation('/dashboard/buy-credits')}
                data-testid="nav-buy-credits"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <Wallet className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-700">Buy Credits</p>
                  <p className="text-xs text-gray-500">Top up your balance</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start p-3"
                onClick={() => handleNavigation('/dashboard/live-tools')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <Wrench className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-700">Live Tools</p>
                  <p className="text-xs text-gray-500">PDF conversion tools</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start p-3"
                onClick={() => handleNavigation('/dashboard/billing-help')}
                data-testid="nav-billing-help"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-700">Billing Help</p>
                  <p className="text-xs text-gray-500">Payments &amp; refunds</p>
                </div>
              </Button>
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="w-5 h-5 mr-3 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Upload PDF</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">View History</span>
                </Button>
              </div>
            </div>

            {/* Upgrade Plan */}
            <div className="mt-8 p-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50">
              <div className="flex items-center mb-2">
                <ArrowUp className="w-4 h-4 text-blue-600 mr-2" />
                <h3 className="text-sm font-semibold text-blue-900">Upgrade Plan</h3>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                Get unlimited conversions and advanced features
              </p>
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() => handleNavigation('/dashboard/manage-plans')}
              >
                View Plans
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-6 p-8 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600 text-white relative overflow-hidden">
              {/* Background decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 transform translate-x-32 -translate-y-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 transform -translate-x-24 translate-y-24"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2" data-testid="text-welcome">Welcome back, {displayName}!</h1>
                    <p className="text-blue-100 text-lg mb-1">Ready to convert your PDFs? You're on the {user?.plan || 'Free'} plan.</p>
                    <p className="text-blue-200 text-sm">{today}</p>
                  </div>
                  <div className="flex space-x-4">
                    <Button className="bg-white/20 border border-white/30 text-white hover:bg-white/30" onClick={() => handleNavigation('/dashboard/live-tools')}>
                      Upload New PDF
                    </Button>
                    <Button className="bg-white/20 border border-white/30 text-white hover:bg-white/30" onClick={() => handleNavigation('/tools')}>
                      View All Tools
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Files Converted"
                value={(totals?.total ?? 0).toLocaleString()}
                subtitle={`${totals?.completed ?? 0} completed`}
                icon={<FileText className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
              />
              <StatCard
                title="API Calls"
                value={(totals?.apiCalls ?? 0).toLocaleString()}
                subtitle={`${totals?.webCalls ?? 0} from the web app`}
                icon={<Activity className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
              />
              <StatCard
                title="Data Processed"
                value={formatBytes(totals?.dataProcessed ?? 0)}
                subtitle="Total output size"
                icon={<ArrowDown className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
              />
              <StatCard
                title="Active API Keys"
                value={(totals?.activeKeys ?? 0).toLocaleString()}
                subtitle={`${totals?.successRate ?? 0}% success rate`}
                icon={<LinkIcon className="w-5 h-5 text-green-600" />}
                iconBg="bg-green-100"
              />
            </div>

            {/* Most Used Tools */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold">Most Used Tools</CardTitle>
                <Button variant="outline" onClick={() => handleNavigation('/tools')}>View All Tools</Button>
              </CardHeader>
              <div className="p-6 pt-0">
                {usage && usage.mostUsed.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center" data-testid="empty-mostused">No conversions yet. Start converting to see your most-used tools here.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {(usage?.mostUsed ?? []).map((tool) => (
                      <div
                        key={tool.type}
                        className="border rounded-lg h-auto p-4 flex flex-col items-center justify-center space-y-3"
                        data-testid={`tool-${tool.type}`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                          <p className="text-xs text-gray-500">{tool.count} {tool.count === 1 ? "use" : "uses"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
                <Button variant="outline" onClick={() => handleNavigation('/dashboard/usage')}>View Full History</Button>
              </CardHeader>
              <div className="p-6 pt-0">
                {usage && usage.recent.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center" data-testid="empty-activity">No recent activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {(usage?.recent ?? []).map((item) => (
                      <ActivityItem
                        key={item.id}
                        title={`${item.outputFilename || item.inputFilename}${item.source === "api" ? " (API)" : ""}`}
                        fileType={getOutputFormatByServerType(item.toolType) ?? "File"}
                        toolType={item.toolType}
                        time={timeAgo(item.createdAt)}
                        status={item.status}
                        canDownload={item.status === "completed"}
                        downloading={downloadingId === item.id}
                        onDownload={() => handleDownload(item)}
                        deleting={deletingId === item.id}
                        onDelete={() => handleDelete(item)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};
