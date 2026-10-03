import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authedJson } from "@/lib/authedFetch";

import { useLocation } from "wouter";
import { Search, FileText, Home, BarChart3, Settings, Book, GitBranch, Wrench, Upload, Clock, ArrowUp, ArrowRight, Copy, Check, Trash2, Plus, Key } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";

interface ApiKeyItem {
  id: string;
  name: string | null;
  maskedKey: string;
  createdAt: string | null;
  lastUsedAt: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export const APISetup: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyItem | null>(null);

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  const { data: keys = [], isLoading } = useQuery<ApiKeyItem[]>({
    queryKey: ["/api/keys"],
    queryFn: () => authedJson<{ data: ApiKeyItem[] }>("/api/keys").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      authedJson<{ data: { apiKey: string } }>("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: (res) => {
      setRevealKey(res.data.apiKey);
      setCreateOpen(false);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not create key", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authedJson(`/api/keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "API key revoked" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not revoke key", description: err.message, variant: "destructive" });
    },
  });

  const copyRevealed = async () => {
    if (!revealKey) return;
    try {
      await navigator.clipboard.writeText(revealKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the key manually.", variant: "destructive" });
    }
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

                <Button className="w-full justify-start p-3 rounded-lg shadow-md">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mr-3">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">API Setup</p>
                    <p className="text-xs text-blue-100">Integration guides</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-white"></div>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-6">API Setup</h1>

              {/* Getting Started Section */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Getting Started</CardTitle>
                </CardHeader>
                <div className="p-6 pt-0">
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-600">1</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900 mb-1">Generate API Key</h3>
                        <p className="text-sm text-gray-600">Create your API key below to authenticate your requests. You can keep up to 3 keys.</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-600">2</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900 mb-1">Configure Endpoints</h3>
                        <p className="text-sm text-gray-600">Send a Bearer token and POST your file to <span className="font-mono text-gray-800">/api/v1/&lt;tool&gt;</span>. See the API Reference for details.</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-600">3</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900 mb-1">Test Integration</h3>
                        <p className="text-sm text-gray-600">Make your first API call to ensure everything is working correctly.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* API Key Management Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">API Key Management</CardTitle>
                  <Button
                    className="text-sm"
                    onClick={() => setCreateOpen(true)}
                    disabled={keys.length >= 3}
                    data-testid="button-create-key"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Key
                  </Button>
                </CardHeader>
                <div className="p-6 pt-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-500" data-testid="status-keys-loading">
                      <ProcessingSpinner size={20} className="mr-2" />
                      Loading keys...
                    </div>
                  ) : keys.length === 0 ? (
                    <div className="text-center py-12" data-testid="empty-keys">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                        <Key className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-4">You don't have any API keys yet.</p>
                      <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-key">
                        <Plus className="w-4 h-4 mr-2" />
                        Create your first key
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {keys.map((k) => (
                        <div
                          key={k.id}
                          className="p-4 rounded-lg bg-gray-50 flex items-center justify-between"
                          data-testid={`row-key-${k.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-medium text-gray-900 truncate" data-testid={`text-keyname-${k.id}`}>
                                {k.name || "Untitled key"}
                              </h3>
                            </div>
                            <p className="text-sm font-mono text-gray-600" data-testid={`text-keymask-${k.id}`}>{k.maskedKey}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Created {formatDate(k.createdAt)} · Last used {k.lastUsedAt ? formatDate(k.lastUsedAt) : "never"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="text-sm text-red-600 hover:text-red-700"
                            onClick={() => setDeleteTarget(k)}
                            data-testid={`button-revoke-${k.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Revoke
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </main>
        </div>

        {/* Create key dialog */}
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setNewKeyName(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>Give your key a name so you can recognize it later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="key-name">Key name (optional)</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production server"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                maxLength={60}
                data-testid="input-key-name"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(newKeyName.trim())}
                disabled={createMutation.isPending}
                data-testid="button-confirm-create-key"
              >
                {createMutation.isPending && <ProcessingSpinner size={16} tone="light" className="mr-2" />}
                Create key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reveal-once dialog */}
        <Dialog open={!!revealKey} onOpenChange={(o) => { if (!o) { setRevealKey(null); setCopied(false); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copy your API key</DialogTitle>
              <DialogDescription>
                This is the only time the full key will be shown. Store it somewhere safe.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-lg bg-gray-100 text-sm font-mono break-all" data-testid="text-revealed-key">
                {revealKey}
              </code>
              <Button onClick={copyRevealed} className="shrink-0" data-testid="button-copy-key">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => { setRevealKey(null); setCopied(false); }}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
              <AlertDialogDescription>
                Any application using <span className="font-mono">{deleteTarget?.maskedKey}</span> will immediately stop working. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                data-testid="button-confirm-revoke"
              >
                Revoke key
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    
  );
};
