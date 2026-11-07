import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, CloudUpload, CheckCircle } from "lucide-react";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { useToast } from "@/hooks/use-toast";
import { downloadBlob, uploadImageToServer } from "@/lib/imageTools";

interface OutputActionsProps {
  // Produces the final edited image on demand (so it always reflects current settings).
  getBlob: () => Promise<Blob>;
  filename: string;
  disabled?: boolean;
}

export const OutputActions: React.FC<OutputActionsProps> = ({ getBlob, filename, disabled }) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await getBlob();
      downloadBlob(blob, filename);
      toast({ title: "Download started", description: filename });
    } catch (e) {
      toast({
        title: "Download failed",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadedUrl(null);
    try {
      const blob = await getBlob();
      const result = await uploadImageToServer(blob, filename);
      setUploadedUrl(result.url);
      toast({
        title: "Saved to server",
        description: "Your image is available at a shareable link.",
      });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleDownload}
          disabled={disabled || isDownloading}
          className="bg-[#f7433d] hover:bg-[#c8302a] text-white"
          data-testid="button-download"
        >
          {isDownloading ? (
            <ProcessingSpinner size={16} tone="light" className="mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download
        </Button>
        <Button
          onClick={handleUpload}
          disabled={disabled || isUploading}
          variant="outline"
          data-testid="button-upload-server"
        >
          {isUploading ? (
            <ProcessingSpinner size={16} className="mr-2" />
          ) : (
            <CloudUpload className="w-4 h-4 mr-2" />
          )}
          {isUploading ? "Saving..." : "Save to server"}
        </Button>
      </div>

      {uploadedUrl && (
        <div
          className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400"
          data-testid="status-uploaded"
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Saved:{" "}
            <a
              href={uploadedUrl}
              target="_blank"
              rel="noreferrer"
              className="underline break-all"
              data-testid="link-uploaded"
            >
              {uploadedUrl}
            </a>
          </span>
        </div>
      )}
    </div>
  );
};
