import React from "react";
import { Link } from "wouter";
import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toolConfigs } from "@/lib/toolConfig";

export const RestoreDocumentUpload: React.FC = () => {
  const cfg = toolConfigs["restore-document"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 flex items-start justify-center">
      <div className="w-full max-w-lg mx-auto px-4 pt-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center rounded-2xl bg-[#f7433d]/10 border border-[#f7433d]/20">
            <RefreshCw className="w-8 h-8 text-[#f7433d]" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7433d]/10 text-[#f7433d] text-xs font-semibold px-3 py-1 mb-4">
            <Clock className="w-3.5 h-3.5" />
            Coming soon
          </span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Document Restore
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            {cfg?.comingSoonNote ??
              "Document Restore is coming soon. Check back shortly."}
          </p>
          <Link href="/tools">
            <Button className="bg-[#f7433d] hover:bg-[#f7433d]/90 text-white">
              Browse other tools
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
