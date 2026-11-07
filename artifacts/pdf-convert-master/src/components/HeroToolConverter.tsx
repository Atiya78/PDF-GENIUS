import { useEffect, useRef, useState } from "react";
import { authedFetch, getAuthError, AuthError } from "@/lib/authedFetch";
import { addGuestDownload, isGuest } from "@/lib/guestDownloads";
import {
  getDownloadFormats,
  produceDownload,
  sanitizeName,
  fetchOcrText,
  type DownloadOption,
} from "@/lib/downloadFormats";
import DownloadFormatModal from "@/components/DownloadFormatModal";
import { GuestRecentDownloads } from "@/components/GuestRecentDownloads";
import "@/styles/marketing.css";
import { Button } from "@/components/ui/button";
import { AuthErrorAction } from "@/components/AuthErrorAction";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { Download, RefreshCw } from "lucide-react";
import {
  ToolConfig,
  getToolActionLabel,
  getServerToolType,
} from "@/lib/toolConfig";

type Stage = "idle" | "converting" | "done" | "error";

const cardShell =
  "mkt-sheet flex flex-col w-full min-h-[360px] items-center justify-center p-8 sm:p-10";

export const HeroToolConverter = ({ tool }: { tool: ToolConfig }): JSX.Element => {
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formats, setFormats] = useState<DownloadOption[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState("");
  const [baseName, setBaseName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const mountedRef = useRef(true);
  // Holds the current input filename so pollJob (whose closure captures a
  // possibly-stale `fileName` state) always has the up-to-date name to fall
  // back to when the backend omits the produced output filename.
  const fileNameRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Images to PDF" combines MULTIPLE images into ONE PDF, so the hero card
  // accepts several files and posts them to the dedicated multi-file endpoint
  // (every other hero tool is single-file via /api/convert).
  const isImagesToPdf = tool.id === "images-to-pdf";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const label = getToolActionLabel(tool);

  const reset = () => {
    setStage("idle");
    setFileName("");
    setOutputName("");
    setError(null);
    setAuthError(null);
    setDownloadUrl(null);
    setJobId(null);
    setModalOpen(false);
    setFormats([]);
    setSelectedFormatId("");
    setBaseName("");
    setDownloading(false);
  };

  const pollJob = (jobId: number) =>
    new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 60;
      const tick = async () => {
        if (!mountedRef.current) return;
        try {
          // Send the JWT so a logged-in user can poll their own job: the server
          // now 403s an owned job when polled without the owner's token.
          const r = await authedFetch(`/api/jobs/${jobId}`);
          const d = await r.json();
          if (!mountedRef.current) return;
          if (!d.success) throw new Error("Failed to get job status");
          const job = d.data;
          if (job.status === "completed") {
            setDownloadUrl(`/api/download/${jobId}`);
            setJobId(jobId);
            // The real produced filename (e.g. "report.docx", "pages.zip") drives
            // the chooser's default name + correct extension; fall back to input.
            setOutputName(job.outputFilename || fileNameRef.current);
            setStage("done");
            // Guests have no dashboard history; persist so they can re-download
            // after a refresh (the file lives in durable server storage).
            if (isGuest()) {
              addGuestDownload({
                toolType: getServerToolType(tool),
                jobId,
                fileName: job.outputFilename || fileName || `download-${jobId}`,
                ts: Date.now(),
              });
            }
            resolve();
            return;
          }
          if (job.status === "failed") {
            throw new Error(job.errorMessage || "Conversion failed");
          }
          attempts++;
          if (attempts < maxAttempts) {
            timerRef.current = setTimeout(tick, 1500);
          } else {
            throw new Error("Processing took longer than expected");
          }
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Conversion failed"));
        }
      };
      timerRef.current = setTimeout(tick, 500);
    });

  const convert = async (f: File) => {
    setStage("converting");
    setError(null);
    setAuthError(null);
    setFileName(f.name);
    fileNameRef.current = f.name;
    setDownloadUrl(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("toolType", getServerToolType(tool));
      fd.append("fileName", f.name);
      fd.append("fileSize", String(f.size));
      fd.append("options", JSON.stringify({}));
      const res = await authedFetch("/api/convert", { method: "POST", body: fd });
      const data = await res.json();
      const authErr = getAuthError(res.status, data?.error);
      if (authErr) throw authErr;
      if (!data.success) throw new Error(data.error || "Conversion failed");
      await pollJob(data.data.jobId);
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof AuthError) setAuthError(e);
      setError(e instanceof Error ? e.message : "Conversion failed");
      setStage("error");
    }
  };

  const convertImages = async (fs: File[]) => {
    if (fs.length === 0) return;
    setStage("converting");
    setError(null);
    setAuthError(null);
    setFileName(fs.length === 1 ? fs[0].name : `${fs.length} images`);
    fileNameRef.current = fs.length === 1 ? fs[0].name : "images";
    setOutputName("images.pdf");
    setDownloadUrl(null);
    try {
      const fd = new FormData();
      for (const f of fs) fd.append("files", f);
      const res = await authedFetch("/api/images-to-pdf", { method: "POST", body: fd });
      const data = await res.json();
      const authErr = getAuthError(res.status, data?.error);
      if (authErr) throw authErr;
      if (!data.success) throw new Error(data.error || "Conversion failed");
      await pollJob(data.data.jobId);
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof AuthError) setAuthError(e);
      setError(e instanceof Error ? e.message : "Conversion failed");
      setStage("error");
    }
  };

  // Opens the shared "pick an output format" chooser. We only ever offer formats
  // we can honestly produce from the result, so for OCR we first check whether
  // recognized text is actually available before listing the text export options.
  const openChooser = async () => {
    if (jobId == null) return;
    const serverToolType = getServerToolType(tool);
    let hasOcrText = false;
    if (serverToolType === "ocr_pdf") {
      const pages = await fetchOcrText(jobId);
      hasOcrText = pages.length > 0;
    }
    const opts = getDownloadFormats({
      serverToolType,
      outputFormat: tool.outputFormat,
      outputName,
      hasOcrText,
    });
    setFormats(opts);
    setSelectedFormatId(opts[0]?.id ?? "");
    const src = outputName || fileName || "output";
    setBaseName(src.replace(/\.[^./]+$/, "") || "output");
    setModalOpen(true);
  };

  const handleConfirmDownload = async () => {
    const selected = formats.find((f) => f.id === selectedFormatId);
    if (!selected || jobId == null || !downloadUrl) return;
    setDownloading(true);
    try {
      const base = sanitizeName(baseName);
      const fullName = `${base}.${selected.ext}`;
      await produceDownload(selected, { downloadUrl, jobId, baseName: base, fullName });
      setModalOpen(false);
    } catch (e) {
      setModalOpen(false);
      setError(e instanceof Error ? e.message : "Download failed");
      setStage("error");
    } finally {
      setDownloading(false);
    }
  };

  if (stage === "idle") {
    return (
      <div className="flex flex-col items-center w-full">
        <UploadDropzone
          acceptedFormats={tool.acceptedFormats}
          maxFileSize={tool.maxFileSize}
          toolId={tool.id}
          title={tool.dropAreaText}
          actionLabel={label}
          multiple={isImagesToPdf}
          maxFiles={isImagesToPdf ? 20 : undefined}
          onFiles={(files) => (isImagesToPdf ? convertImages(files) : convert(files[0]))}
          onValidationError={(msg) => {
            setFileName("");
            setError(msg);
            setStage("error");
          }}
          className="w-full min-h-[340px] justify-center rounded-[14px] border-[#d9cfc1] bg-[#fffdf9] p-8 sm:p-10"
          testId={`hero-converter-${tool.id}`}
        />
        <GuestRecentDownloads toolType={getServerToolType(tool)} />
      </div>
    );
  }

  return (
    <div className={cardShell} data-testid={`hero-converter-${tool.id}`}>
      {stage === "converting" && (
        <div className="flex flex-col items-center justify-center w-full text-center">
          <ConverterStatusIcon status="processing" size={96} className="mb-3" />
          <h2 className="font-['Poppins'] font-semibold text-[#1c1917] text-xl mb-2">Converting…</h2>
          <p
            className="text-[#57534e] text-sm truncate max-w-full"
            data-testid={`text-hero-converting-${tool.id}`}
          >
            {fileName}
          </p>
        </div>
      )}

      {stage === "done" && (
        <div className="flex flex-col items-center justify-center w-full text-center">
          <ConverterStatusIcon status="success" size={96} className="mb-2" />
          <h2 className="font-['Poppins'] font-semibold text-[#1c1917] text-xl mb-2">
            Conversion complete
          </h2>
          <p className="text-[#57534e] text-sm mb-6 truncate max-w-full">
            {fileName}
          </p>
          <button
            type="button"
            onClick={openChooser}
            className="edu-btn-primary mb-4"
            data-testid={`button-hero-download-${tool.id}`}
          >
            <Download className="mr-2 h-5 w-5" />
            Download
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#57534e] underline decoration-[#d9d0c3] underline-offset-4 hover:text-[#1c1917] hover:decoration-[#f7433d]"
            data-testid={`button-hero-reset-${tool.id}`}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Convert another file
          </button>
        </div>
      )}

      {stage === "error" && (
        <div className="flex flex-col items-center justify-center w-full text-center">
          <ConverterStatusIcon status="error" size={96} className="mb-2" />
          <h2 className="font-['Poppins'] font-semibold text-[#1c1917] text-xl mb-2">
            Something went wrong
          </h2>
          <p
            className="text-[#c8302a] text-sm mb-4 max-w-full"
            data-testid={`text-hero-error-${tool.id}`}
          >
            {error}
          </p>
          {authError && (
            <div className="mb-6">
              <AuthErrorAction
                to={authError.linkTo}
                label={authError.linkLabel}
                testId={`link-hero-auth-${tool.id}`}
              />
            </div>
          )}
          <Button
            onClick={reset}
            className="edu-btn-ghost h-11"
            variant="outline"
            data-testid={`button-hero-retry-${tool.id}`}
          >
            Try again
          </Button>
        </div>
      )}

      <DownloadFormatModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        subtitle={`Your ${tool.title} result is ready.`}
        formats={formats}
        selectedId={selectedFormatId}
        onSelect={setSelectedFormatId}
        onConfirm={handleConfirmDownload}
        busy={downloading}
        fileName={baseName}
        onChangeFileName={setBaseName}
        previewName={
          selectedFormatId
            ? `${sanitizeName(baseName)}.${formats.find((f) => f.id === selectedFormatId)?.ext ?? ""}`
            : undefined
        }
      />
    </div>
  );
};
