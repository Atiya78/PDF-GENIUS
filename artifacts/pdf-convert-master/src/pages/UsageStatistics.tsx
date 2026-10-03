import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { authedJson } from "@/lib/authedFetch";

import { useLocation } from "wouter";
import { Search, FileText, Activity, ArrowDown, Check, Home, BarChart3, Settings, Book, GitBranch, Wrench, Upload, Clock, ArrowUp, ArrowRight, Download } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
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
  byDay: { date: string; count: number }[];
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
  if (Number.isNaN(d)) return "";
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  processing: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-700",
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, iconBg, icon }) => {
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

export const UsageStatistics: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = React.useState<number | null>(null);

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  // Re-download a past conversion from history. Bytes are fetched fresh from the
  // backend's durable object storage, so it works anytime.
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

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    queryFn: () => authedJson<{ data: UsageData }>("/api/usage").then((r) => r.data),
  });

  const totals = usage?.totals;
  const maxCount = Math.max(1, ...((usage?.mostUsed ?? []).map((t) => t.count)));
  const byDay = usage?.byDay ?? [];
  const maxDay = Math.max(1, ...byDay.map((d) => d.count));
  const dayLabel = (dateKey: string) => {
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateKey;
    return parsed.toLocaleDateString(undefined, { weekday: "short" });
  };

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
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3"
                  onClick={() => handleNavigation('/dashboard')}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                    <Home className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-700">Home</p>
                    <p className="text-xs text-gray-500">Dashboard overview</p>
                  </div>
                </Button>

                <Button className="w-full justify-start p-3 rounded-lg shadow-md">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mr-3">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">Total Usage</p>
                    <p className="text-xs text-blue-100">Usage statistics</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-white"></div>
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

                <Button variant="ghost" className="w-full justify-start p-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-700">API Documentation</p>
                    <p className="text-xs text-gray-500">Complete API docs</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
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
              {/* Page Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Usage Statistics</h1>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard
                  title="Files Converted"
                  value={(totals?.total ?? 0).toLocaleString()}
                  subtitle={`${totals?.completed ?? 0} completed · ${totals?.failed ?? 0} failed`}
                  icon={<FileText className="w-5 h-5 text-blue-600" />}
                  iconBg="bg-blue-100"
                />
                <StatCard
                  title="API Calls"
                  value={(totals?.apiCalls ?? 0).toLocaleString()}
                  subtitle={`${totals?.webCalls ?? 0} via web app`}
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
                  title="Success Rate"
                  value={`${totals?.successRate ?? 0}%`}
                  subtitle={`${totals?.activeKeys ?? 0} active API keys`}
                  icon={<Check className="w-5 h-5 text-green-600" />}
                  iconBg="bg-green-100"
                />
              </div>

              {/* Most used tools breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Most Used Tools</CardTitle>
                </CardHeader>
                <div className="p-6 pt-0">
                  {usage && usage.mostUsed.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center" data-testid="empty-usage-tools">No conversions recorded yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {(usage?.mostUsed ?? []).map((tool) => (
                        <div key={tool.type} data-testid={`usage-tool-${tool.type}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{tool.name}</span>
                            <span className="text-sm text-gray-500">{tool.count} {tool.count === 1 ? "use" : "uses"}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.round((tool.count / maxCount) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Daily usage bar chart */}
              {byDay.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Daily Usage</CardTitle>
                    <p className="text-sm text-gray-500">Conversions over the last {byDay.length} days</p>
                  </CardHeader>
                  <div className="p-6 pt-0">
                    <div className="flex items-end justify-between gap-2 h-40" data-testid="usage-daily-chart">
                      {byDay.map((day) => (
                        <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-2 h-full">
                          <span className="text-xs text-gray-500">{day.count}</span>
                          <div
                            className="w-full rounded-md bg-blue-600 min-h-[4px]"
                            style={{ height: `${Math.round((day.count / maxDay) * 100)}%` }}
                            data-testid={`usage-daily-bar-${day.date}`}
                          ></div>
                          <span className="text-xs text-gray-400">{dayLabel(day.date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Recent conversions */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Recent Conversions</CardTitle>
                </CardHeader>
                <div className="p-6 pt-0">
                  {usage && usage.recent.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center" data-testid="empty-usage-recent">No conversions recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {(usage?.recent ?? []).map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between gap-4 py-3"
                          data-testid={`usage-recent-${job.id}`}
                        >
                          {(() => {
                            const cfg = getToolConfigByServerType(job.toolType);
                            return (
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg ? `${cfg.iconBgColor} border ${cfg.iconBorderColor}` : "bg-gray-100 border border-gray-200"}`}
                              >
                                {cfg
                                  ? <ToolLottieIcon toolId={cfg.id} config={cfg} size={26} loop={false} />
                                  : <FileText className="w-4 h-4 text-gray-500" />}
                              </div>
                            );
                          })()}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-700 truncate">{job.outputFilename || job.inputFilename}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge className={`border-0 ${job.status === "completed" ? "bg-gray-100 text-gray-700" : STATUS_BADGE[job.status] ?? "bg-gray-100 text-gray-700"}`}>
                              {job.status === "completed"
                                ? getOutputFormatByServerType(job.toolType) ?? "File"
                                : job.status === "failed" ? "Failed" : job.status}
                            </Badge>
                            <span className="text-xs text-gray-500 w-16 text-right">{timeAgo(job.createdAt)}</span>
                            {job.status === "completed" && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() => handleDownload(job)}
                                disabled={downloadingId === job.id}
                                aria-label="Download file again"
                                title="Download again"
                                data-testid={`download-usage-${job.id}`}
                              >
                                {downloadingId === job.id
                                  ? <ProcessingSpinner size={16} />
                                  : <Download className="w-4 h-4" />}
                              </Button>
                            )}
                          </div>
                        </div>
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
