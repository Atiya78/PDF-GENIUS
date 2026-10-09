import { useState, useRef, useCallback, useEffect } from "react";
import { authedFetch } from "@/lib/authedFetch";
import {
  TrendingUp,
  Download,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageToolShell } from "@/components/image-tools/ImageToolShell";
import { ImageDropzone } from "@/components/image-tools/ImageDropzone";
import { loadImageFromFile, downloadBlob, formatBytes } from "@/lib/imageTools";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_MB = 10;

type Stage = "idle" | "processing" | "done" | "error";

export const UpscaleImageUpload = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [beforeDims, setBeforeDims] = useState<{ w: number; h: number } | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [afterDims, setAfterDims] = useState<{ w: number; h: number } | null>(null);
  const afterBlobRef = useRef<Blob | null>(null);
  const [scale, setScale] = useState(4);
  const [resultScale, setResultScale] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  // Revoke preview object URLs when they change or the component unmounts.
  useEffect(() => {
    return () => {
      if (beforeUrl) URL.revokeObjectURL(beforeUrl);
    };
  }, [beforeUrl]);
  useEffect(() => {
    return () => {
      if (afterUrl) URL.revokeObjectURL(afterUrl);
    };
  }, [afterUrl]);

  const handleFile = useCallback(
    async (f: File) => {
      try {
        const { img, url } = await loadImageFromFile(f);
        setFile(f);
        setBeforeUrl(url);
        setBeforeDims({ w: img.naturalWidth, h: img.naturalHeight });
        setAfterUrl(null);
        setAfterDims(null);
        setResultScale(null);
        afterBlobRef.current = null;
        setStage("idle");
        setError(null);
      } catch (e) {
        toast({
          title: "Could not load image",
          description: e instanceof Error ? e.message : "Error",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const changeScale = (s: number) => {
    setScale(s);
    if (stage === "error") {
      setStage(afterUrl ? "done" : "idle");
      setError(null);
    }
  };

  const pollJob = async (jobId: number): Promise<void> => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 1000 : 2000));
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error("Failed to check upscaling status");
      const job = data.data;
      if (job.status === "completed") return;
      if (job.status === "failed") {
        throw new Error(job.errorMessage || "Upscaling failed on the server");
      }
    }
    throw new Error("Upscaling timed out. Please try a smaller image.");
  };

  const upscale = async () => {
    if (!file) return;
    setStage("processing");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("toolType", "upscale_image");
      formData.append("fileName", file.name);
      formData.append("fileSize", String(file.size));
      formData.append("options", JSON.stringify({ scale }));

      const res = await authedFetch("/api/convert", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || "Failed to start upscaling");
      }

      const jobId = data.data.jobId;
      await pollJob(jobId);

      // Use the authed fetch so the signed-in owner can retrieve their file —
      // /api/download enforces per-user ownership on user-attributed jobs.
      const dl = await authedFetch(`/api/download/${jobId}`);
      if (!dl.ok) throw new Error("Failed to retrieve the upscaled image");
      const blob = await dl.blob();
      afterBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setAfterUrl(url);
      setResultScale(scale);

      const img = new Image();
      img.onload = () => setAfterDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;

      setStage("done");
      toast({ title: "Upscaling complete", description: "Your enhanced image is ready." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upscaling failed";
      setError(msg);
      setStage("error");
      toast({ title: "Upscaling failed", description: msg, variant: "destructive" });
    }
  };

  const download = () => {
    if (!afterBlobRef.current || !file) return;
    const stem = file.name.replace(/\.[^./]+$/, "");
    downloadBlob(afterBlobRef.current, `${stem}_upscaled_${resultScale ?? scale}x.webp`);
  };

  const reset = () => {
    setFile(null);
    setBeforeUrl(null);
    setBeforeDims(null);
    setAfterUrl(null);
    setAfterDims(null);
    setResultScale(null);
    afterBlobRef.current = null;
    setStage("idle");
    setError(null);
  };

  return (
    <ImageToolShell
      title="AI Image Upscaler"
      description="Upscale with Aura SR v2 and download WebP. Choose native 4× output or a 2× version resized from the AI result, then compare before and after."
      icon={<TrendingUp className="w-8 h-8 text-blue-500" />}
      iconBg="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800"
      hideHeader={!file}
    >
      {!file ? (
        <ImageDropzone
          acceptedFormats={ACCEPTED}
          maxSizeMB={MAX_MB}
          onFile={handleFile}
          toolId="upscale-images"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Before</span>
                {beforeDims && (
                  <span className="text-xs text-gray-500" data-testid="text-before-dims">
                    {beforeDims.w}×{beforeDims.h} • {formatBytes(file.size)}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 flex items-center justify-center min-h-[220px]">
                {beforeUrl && (
                  <img
                    src={beforeUrl}
                    alt="before"
                    className="max-h-[300px] max-w-full object-contain rounded"
                    data-testid="img-before"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                   After (AI {resultScale ?? scale}×)
                </span>
                {afterDims && (
                  <span className="text-xs text-gray-500" data-testid="text-after-dims">
                    {afterDims.w}×{afterDims.h}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 flex items-center justify-center min-h-[220px]">
                {stage === "processing" && (
                  <div className="text-center">
                    <ConverterStatusIcon status="processing" size={72} className="mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">Enhancing with AI…</p>
                    <p className="text-xs text-gray-400 mt-1">This can take 20–60 seconds</p>
                  </div>
                )}
                {stage === "error" && (
                  <div className="text-center text-red-600 dark:text-red-400 px-4">
                    <ConverterStatusIcon status="error" size={72} className="mb-2" />
                    <p className="text-sm" data-testid="text-error">
                      {error}
                    </p>
                  </div>
                )}
                {stage === "done" && afterUrl && (
                  <img
                    src={afterUrl}
                    alt="after"
                    className="max-h-[300px] max-w-full object-contain rounded"
                    data-testid="img-after"
                  />
                )}
                {stage === "idle" && (
                  <p className="text-sm text-gray-400">Enhanced image will appear here</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <Label className="mb-2 block">Upscale factor</Label>
              <div className="flex gap-2">
                {[2, 4].map((s) => (
                  <Button
                    key={s}
                    variant={scale === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => changeScale(s)}
                    disabled={stage === "processing"}
                    data-testid={`button-scale-${s}x`}
                  >
                    {s}×
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
              {(stage !== "done" || scale !== resultScale) && (
                <Button
                  onClick={upscale}
                  disabled={stage === "processing"}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-upscale"
                >
                  {stage === "processing" ? (
                    <ConverterStatusIcon status="processing" size={16} className="mr-2 brightness-0 invert" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {stage === "processing" ? "Upscaling…" : "Upscale with AI"}
                </Button>
              )}
              {afterUrl && (
                <Button
                  onClick={download}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                variant="outline"
                onClick={reset}
                disabled={stage === "processing"}
                data-testid="button-reset"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                New image
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-upscale-output-info">
            Aura SR v2 generates a native 4× image. The 2× option resizes that AI result.
            {" "}Downloads are WebP. Changing the selection keeps your completed result until you run another upscale.
          </p>
        </div>
      )}
    </ImageToolShell>
  );
};
