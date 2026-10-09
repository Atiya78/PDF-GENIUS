import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { useLocation } from "wouter";
import { Search, Home, BarChart3, Settings, Book, GitBranch, Wrench, Upload, Clock, ArrowUp, Copy, Check } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { useSeo } from "@/lib/useSeo";

interface Tool {
  type: string;
  name: string;
  category: string;
  inputFormats: string[];
  maxFileSize: number;
}

export const APIReference: React.FC<{ publicView?: boolean }> = ({ publicView = false }) => {
  useSeo({
    enabled: publicView,
    title: "PDF Conversion API Documentation",
    description: "Explore PDF Genius API authentication, supported conversion endpoints, file limits and request examples. Read the reference before creating an API key.",
    canonicalPath: "/docs",
  });
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  // Public API is served from the custom domain, so docs always show it
  // (not the Replit dev/preview origin).
  const API_DOMAIN = "https://pdfgenius.app";
  const baseUrl = `${API_DOMAIN}/api/v1`;

  // Tools documented in the reference but currently offline (no live endpoint).
  // Mirrors OFFLINE_API_TOOLS in the api-server routes.
  const OFFLINE_TOOL_TYPES = new Set<string>(["restore_document", "edit_pdf"]);

  // Edit PDF is an announced API that isn't in /api/tools yet. We surface it in
  // the reference (marked offline) so developers know it's coming. This is the
  // individual Edit PDF tool, not the "Edit" tool category.
  const EDIT_PDF_TOOL: Tool = {
    type: "edit_pdf",
    name: "Edit PDF",
    category: "pdf_management",
    inputFormats: ["pdf"],
    maxFileSize: 50,
  };

  const { data: fetchedTools = [], isLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
    queryFn: async () => {
      const res = await fetch("/api/tools");
      const body = await res.json();
      return body.data as Tool[];
    },
  });

  // Append the announced Edit PDF endpoint if the server doesn't already list it.
  const tools = fetchedTools.some((t) => t.type === "edit_pdf")
    ? fetchedTools
    : [...fetchedTools, EDIT_PDF_TOOL];

  // Tool-specific request options honoured by the live /api/v1 endpoint.
  // (Format list + max size come straight from /api/tools so they never drift.)
  const TOOL_OPTIONS: Record<string, { name: string; desc: string }[]> = {
    csv_to_pdf: [
      { name: "delimiter", desc: "auto (default), comma (,), semicolon (;), tab (\\t) or pipe (|)" },
      { name: "paperSize", desc: "A4 (default) or Letter" },
      { name: "orientation", desc: "landscape (default) or portrait" },
      { name: "firstRowHeader", desc: "Use row 1 as the repeated table header (default true)" },
      { name: "fontSize", desc: "8, 10 (default) or 12 points" },
    ],
    convert_image_format: [
      { name: "outputFormat", desc: "Lower-case target format: jpg, png, webp, gif, bmp or tiff. Output is a single image file with the matching extension." },
      { name: "quality", desc: "Number 10-100 (default 90). Applies only to lossy formats (jpg, webp); ignored for others. HEIC/HEIF input: up to 25 MB and 40 megapixels." },
    ],
    pdf_to_images: [
      { name: "outputFormat", desc: "Lower-case jpg or png. Output is a ZIP with one image per page (.zip)." },
      { name: "dpi", desc: "Number: 72, 150 (default) or 300. Render resolution." },
      { name: "quality", desc: "Number 10-100 (default 90). JPG only. Up to 500 pages and 128 MB of exported images." },
    ],
    split_pdf: [
      { name: "mode", desc: "all: one PDF per page; ranges: one PDF per comma-separated range; every_n: parts of pagesPerSplit pages; extract: selected pages combined into one PDF. One output file is a PDF; several are a ZIP. The real extension is in outputFilename on the completed job." },
      { name: "ranges", desc: 'Required for ranges/extract, e.g. "1-3,5,8-10". Pages are 1-based. Invalid or out-of-bounds ranges fail.' },
      { name: "pagesPerSplit", desc: "Integer 1 or more. Required for every_n. Also accepted as split.mode / split.pagesPerSplit." },
    ],
    rotate_pdf: [
      { name: "angle", desc: "90 (clockwise), 270 (90 counter-clockwise) or 180. Added to each page's existing rotation." },
      { name: "pages", desc: 'all (default) or 1-based page ranges, e.g. "1-3,5". Unselected pages are unchanged. Output is a PDF.' },
    ],
    html_to_pdf: [
      { name: "inputMode", desc: 'file (default) or url. For url, the multipart "file" field is optional.' },
      { name: "url", desc: "Public HTTP/HTTPS webpage URL on port 80 or 443, without embedded credentials. Private/internal/reserved addresses are unsupported; redirects are revalidated." },
      { name: "URL limits", desc: "5 MB HTML, 2 MB per asset, 12 MB total, 40 requests, up to 3 redirects per resource. DNS: 5s; request: 10s; overall fetch budget: 30s. JavaScript/login-dependent pages may not render." },
    ],
    compress_image: [
      { name: "compressionLevel", desc: "low (best quality), medium (default) or high (smallest file). Compare outputFileSize on the completed job with your input size; savings are not guaranteed." },
    ],
    compress_pdf: [
      { name: "compressionLevel", desc: "low (best quality), medium (default) or high (smallest file). Output is a PDF; outputFileSize reports the real size, which can be equal to or larger than the input." },
    ],
    ocr_pdf: [
      { name: "language", desc: "eng, ben or eng+ben. API/native OCR runs server-side with native Tesseract and returns a searchable PDF. The recognised text is available at GET /api/ocr-text/:jobId. This is separate from the website OCR tool, which runs entirely in the browser." },
    ],
    resize_image: [
      { name: "width", desc: "Target width in px" },
      { name: "height", desc: "Target height in px" },
      { name: "percentage", desc: "Scale by percent instead of width/height" },
      { name: "maintainAspectRatio", desc: "Keep aspect ratio (default true)" },
    ],
    rotate_image: [
      { name: "angle", desc: "Rotation in degrees (default 90)" },
      { name: "flipHorizontal", desc: "Mirror horizontally (true/false)" },
      { name: "flipVertical", desc: "Mirror vertically (true/false)" },
    ],
    crop_image: [
      { name: "x", desc: "Left offset in px" },
      { name: "y", desc: "Top offset in px" },
      { name: "width", desc: "Crop width in px" },
      { name: "height", desc: "Crop height in px (omit all four for a centered 75% crop)" },
    ],
    upscale_image: [
      { name: "scale", desc: "Upscale factor — 2 or 4 (default 4); requires AI upscaling" },
    ],
    lock_pdf: [
      { name: "password", desc: "Password used to AES-256 encrypt the PDF (required)" },
    ],
    unlock_pdf: [
      { name: "password", desc: "Current password of the protected PDF (required)" },
    ],
  };

  const fileRule = (type: string) =>
    type === "merge_pdfs"
      ? "2–20 files (one field per file, named files)"
      : "Exactly 1 file (field named file)";

  const filteredTools = tools.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q);
  });

  const sampleTool = tools.find((t) => t.type === "pdf_to_word") || tools[0];
  const sampleType = sampleTool?.type || "pdf_to_word";
  const curlExample = `curl -X POST "${baseUrl}/${sampleType}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@document.pdf" \\
  -o converted_output`;

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlExample);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the command manually.", variant: "destructive" });
    }
  };

  return (
    
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar */}
          {!publicView && <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:min-h-screen">
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search tools..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-tools"
                />
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

                <Button className="w-full justify-start p-3 rounded-lg shadow-md">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mr-3">
                    <Book className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">API Reference</p>
                    <p className="text-xs text-blue-100">Documentation</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-white"></div>
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
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleNavigation('/dashboard/live-tools')}
                    data-testid="button-quick-upload"
                  >
                    <Upload className="w-5 h-5 mr-3 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Upload PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleNavigation('/dashboard/usage')}
                    data-testid="button-quick-history"
                  >
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
          </aside>}

          {/* Main Content */}
          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Page Header */}
              <h1 className="text-2xl font-bold text-gray-900 mb-6">API Reference</h1>
              {publicView && (
                <div className="mb-6 space-y-3">
                  <p className="text-gray-600">Read the reference without an account. Sign in to create and manage your API key.</p>
                  <Input aria-label="Search documented tools" placeholder="Search tools…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
                  <Button onClick={() => handleNavigation("/dashboard/api-setup")}>Get API Key</Button>
                </div>
              )}

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Quick Reference Card */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Quick Reference</CardTitle>
                  </CardHeader>
                  <div className="p-6 pt-0 space-y-3">
                    {/* Base URL */}
                    <div className="p-3 rounded-lg bg-gray-50">
                      <div className="mb-2">
                        <p className="text-base font-medium text-gray-900">Base URL</p>
                      </div>
                      <p className="text-sm font-mono text-gray-600 break-all" data-testid="text-base-url">{baseUrl}</p>
                    </div>

                    {/* Authentication */}
                    <div className="p-3 rounded-lg bg-gray-50">
                      <div className="mb-2">
                        <p className="text-base font-medium text-gray-900">Authentication</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-mono">Authorization: Bearer &lt;your-api-key&gt;</span> — create one under API Setup.
                      </p>
                    </div>

                    {/* Request format */}
                    <div className="p-3 rounded-lg bg-gray-50">
                      <div className="mb-2">
                        <p className="text-base font-medium text-gray-900">Request format</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-mono">multipart/form-data</span> with a <span className="font-mono">file</span> field. Returns the converted file bytes directly.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Available Endpoints Card */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Available Endpoints</CardTitle>
                  </CardHeader>
                  <div className="p-6 pt-0 space-y-3 max-h-[520px] overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8 text-gray-500" data-testid="status-tools-loading">
                        <ProcessingSpinner size={20} className="mr-2" />
                        Loading endpoints...
                      </div>
                    ) : filteredTools.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-500" data-testid="status-no-tools">
                        No tools match “{search}”.
                      </div>
                    ) : (
                      filteredTools.map((tool) => {
                        const opts = TOOL_OPTIONS[tool.type] || [];
                        const isOffline = OFFLINE_TOOL_TYPES.has(tool.type);
                        return (
                          <div
                            key={tool.type}
                            className={`p-3 rounded-lg border ${isOffline ? "border-gray-200 bg-gray-100/60 opacity-80" : "border-gray-100 bg-gray-50/50"}`}
                            data-testid={`endpoint-${tool.type}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-mono text-gray-900">POST /api/v1/{tool.type}</span>
                              {isOffline ? (
                                <Badge className="bg-gray-200 text-gray-600 border-gray-300" data-testid={`badge-offline-${tool.type}`}>Offline</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 border-green-200" data-testid={`badge-available-${tool.type}`}>Available</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{tool.name}</p>

                            {isOffline && (
                              <p className="text-xs text-gray-500 mb-2" data-testid={`endpoint-offline-note-${tool.type}`}>
                                This endpoint is currently offline and returns <span className="font-mono">503</span>. It will be enabled soon.
                              </p>
                            )}

                            <div className="space-y-1.5 text-xs text-gray-600">
                              <div data-testid={`endpoint-accepts-${tool.type}`}>
                                <span className="font-medium text-gray-700">Accepts: </span>
                                {tool.inputFormats && tool.inputFormats.length > 0 ? (
                                  <span className="inline-flex flex-wrap gap-1 align-middle">
                                    {tool.inputFormats.map((f) => (
                                      <code key={f} className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">.{f}</code>
                                    ))}
                                  </span>
                                ) : (
                                  <span>—</span>
                                )}
                              </div>

                              <div data-testid={`endpoint-maxsize-${tool.type}`}>
                                <span className="font-medium text-gray-700">Max size: </span>
                                {tool.maxFileSize} MB per file
                              </div>

                              <div data-testid={`endpoint-files-${tool.type}`}>
                                <span className="font-medium text-gray-700">Files: </span>
                                {fileRule(tool.type)}
                              </div>

                              <div data-testid={`endpoint-options-${tool.type}`}>
                                <span className="font-medium text-gray-700">Options: </span>
                                {opts.length > 0 ? (
                                  <span>
                                    {opts.map((o, i) => (
                                      <span key={o.name}>
                                        <code className="px-1 py-0.5 rounded bg-gray-200 text-gray-700">{o.name}</code>
                                        <span className="text-gray-500"> — {o.desc}</span>
                                        {i < opts.length - 1 ? "; " : ""}
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">None</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </div>

              {/* Example request */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Example Request</CardTitle>
                  <Button variant="outline" className="text-sm" onClick={copyCurl} data-testid="button-copy-curl">
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </CardHeader>
                <div className="p-6 pt-0">
                  <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto" data-testid="code-curl-example">
                    <code>{curlExample}</code>
                  </pre>
                  <p className="text-xs text-gray-500 mt-3">
                    For <span className="font-mono">merge_pdfs</span>, send multiple <span className="font-mono">files</span> fields. For
                    <span className="font-mono"> convert_image_format</span>, add <span className="font-mono">-F 'options=&#123;"outputFormat":"png"&#125;'</span>.
                  </p>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    
  );
};
