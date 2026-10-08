import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { RefreshCw, Download, RotateCcw } from "lucide-react";
import { ToolLottieIcon } from "@/components/tool-lottie-icon";
import { CSV_MAX_BYTES, decodeCsv, parseCsv } from "@workspace/csv-utils";
import { ToolPageShell } from "@/components/upload/ToolPageShell";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { ProcessingSpinner } from "@/components/processing-spinner";
import { PausedToolNotice } from "@/components/PausedToolNotice";
import { useToolPaused } from "@/lib/usePausedTools";
import { authedFetch, getAuthError } from "@/lib/authedFetch";
import { downloadFromUrl } from "@/lib/download";
import { isGuest } from "@/lib/guestDownloads";

const TOOL_TYPE = "csv_to_pdf";
const PREVIEW_ROWS = 8;
const POLL_MS = 1500;
const MAX_POLLS = 60;

type Delimiter = "auto" | "," | ";" | "\t" | "|";
type Phase = "idle" | "converting" | "completed" | "failed";

const DELIMS: { value: Delimiter; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe" },
];
const DELIM_NAMES: Record<string, string> = { ",": "comma", ";": "semicolon", "\t": "tab", "|": "pipe" };

const fieldCls =
  "w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f7433d] disabled:opacity-60 disabled:cursor-not-allowed";
const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f7433d] px-6 text-base font-semibold text-white hover:bg-[#e03832] focus:outline-none focus:ring-2 focus:ring-[#f7433d] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 text-base font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#f7433d] disabled:opacity-50 disabled:cursor-not-allowed";

const formatSize = (b: number) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`);

export const CsvToPdfUpload: React.FC = () => {
  const isPaused = useToolPaused(TOOL_TYPE);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [delimiter, setDelimiter] = useState<Delimiter>("auto");
  const [paperSize, setPaperSize] = useState<"A4" | "Letter">("A4");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [fontSize, setFontSize] = useState<8 | 10 | 12>(10);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loginNeeded, setLoginNeeded] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [guestDownloaded, setGuestDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const readToken = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  const busy = phase === "converting";
  const locked = busy || reading;

  useEffect(
    () => () => {
      readToken.current++;
      abortRef.current?.abort();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const parsed = useMemo(() => {
    if (text === null) return null;
    try {
      return { table: parseCsv(text, delimiter), error: null as string | null };
    } catch (e) {
      return { table: null, error: e instanceof Error ? e.message : "This CSV could not be parsed." };
    }
  }, [text, delimiter]);

  const table = parsed?.table ?? null;
  const parseError = parsed?.error ?? null;

  const resetAll = useCallback(() => {
    readToken.current++;
    abortRef.current?.abort();
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setFile(null);
    setText(null);
    setReadError(null);
    setReading(false);
    setPhase("idle");
    setError(null);
    setLoginNeeded(false);
    setDownloadUrl(null);
    setGuestDownloaded(false);
    setDownloadError(null);
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    const token = ++readToken.current;
    setFile(f);
    setText(null);
    setReadError(null);
    setPhase("idle");
    setError(null);
    setDownloadUrl(null);
    if (f.size > CSV_MAX_BYTES) {
      setReadError("Choose a CSV file no larger than 5 MB.");
      return;
    }
    setReading(true);
    f.arrayBuffer()
      .then((buf) => {
        if (token !== readToken.current) return;
        setText(decodeCsv(new Uint8Array(buf)));
      })
      .catch((e) => {
        if (token !== readToken.current) return;
        setReadError(e instanceof Error ? e.message : "This file could not be read.");
      })
      .finally(() => {
        if (token === readToken.current) setReading(false);
      });
  }, []);

  const fail = (message: string) => {
    setError(message);
    setPhase("failed");
  };

  const poll = (jobId: number, attempt: number, signal: AbortSignal) => {
    timerRef.current = window.setTimeout(async () => {
      if (signal.aborted) return;
      try {
        const res = await authedFetch(`/api/jobs/${jobId}`, { signal });
        const body = await res.json();
        if (signal.aborted) return;
        if (!body.success) throw new Error(body.error || "Failed to get job status");
        const job = body.data;
        if (job.status === "completed") {
          setDownloadUrl(`/api/download/${jobId}`);
          setPhase("completed");
          return;
        }
        if (job.status === "failed") {
          fail(job.errorMessage || "Conversion failed.");
          return;
        }
        if (attempt + 1 >= MAX_POLLS) {
          fail("Processing took longer than expected. Please try again.");
          return;
        }
        poll(jobId, attempt + 1, signal);
      } catch (e) {
        if (signal.aborted) return;
        if (attempt + 1 >= MAX_POLLS) {
          fail(e instanceof Error ? e.message : "Unable to check conversion status.");
          return;
        }
        poll(jobId, attempt + 1, signal);
      }
    }, attempt === 0 ? 500 : POLL_MS);
  };

  const convert = async () => {
    if (!file || !table || locked || isPaused) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("converting");
    setError(null);
    setLoginNeeded(false);
    setDownloadUrl(null);
    setGuestDownloaded(false);
    setDownloadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("toolType", TOOL_TYPE);
      fd.append("fileName", file.name);
      fd.append("fileSize", String(file.size));
      fd.append("options", JSON.stringify({ delimiter, paperSize, orientation, firstRowHeader, fontSize }));
      const res = await authedFetch("/api/convert", { method: "POST", body: fd, signal: controller.signal });
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (controller.signal.aborted) return;
      const authErr = getAuthError(res.status, body?.error);
      if (authErr) {
        setLoginNeeded(true);
        fail(authErr.message);
        return;
      }
      if (!res.ok || !body?.success) throw new Error(body?.error || `Upload failed (${res.status})`);
      if (!Number.isInteger(body?.data?.jobId)) throw new Error("The server did not return a conversion job. Please try again.");
      poll(body.data.jobId, 0, controller.signal);
    } catch (e) {
      if (controller.signal.aborted) return;
      fail(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  const download = async () => {
    if (!downloadUrl || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const base = file?.name.replace(/\.[^.]+$/, "") || "table";
      await downloadFromUrl(downloadUrl, `${base}.pdf`);
      if (isGuest()) setGuestDownloaded(true);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Could not download the file.");
    } finally {
      setDownloading(false);
    }
  };

  const hasHeader = firstRowHeader && !!table;
  const previewRows = table ? table.rows.slice(0, PREVIEW_ROWS) : [];
  const headRow = hasHeader ? previewRows[0] : null;
  const bodyRows = hasHeader ? previewRows.slice(1) : previewRows;
  const limit = orientation === "landscape" ? 8 : 5;
  const sections = table ? Math.max(1, table.columnCount <= limit ? 1 : 1 + Math.ceil((table.columnCount - limit) / (limit - 1))) : 0;
  const showWorking = !!file;

  return (
    <ToolPageShell
      title="CSV to PDF"
      description="Turn a CSV file into a printable PDF table."
      icon={<ToolLottieIcon toolId="csv-to-pdf" size={48} />}
      iconBoxClassName="border-[#f7433d]/30 bg-[#f7433d]/10"
      maxWidth="max-w-4xl"
      showHeader={showWorking}
    >
      {isPaused && !busy && phase !== "completed" && <PausedToolNotice toolTitle="CSV to PDF" />}

      {!showWorking && !isPaused && (
        <>
          <UploadDropzone
            acceptedFormats={[".csv"]}
            maxFileSize={5}
            toolId="csv-to-pdf"
            title="Select a CSV file"
            actionLabel="Select CSV file"
            onFiles={handleFiles}
            onValidationError={(m) => setReadError(m)}
            testId="input-csv-file"
          />
          {readError && (
            <p role="alert" data-testid="csv-error" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {readError}
            </p>
          )}
          <p className="mt-4 text-center text-xs text-gray-500">
            The preview is built in your browser. When you convert, the file is uploaded to our server to create the PDF.
          </p>
        </>
      )}

      {showWorking && file && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900" data-testid="text-csv-filename">{file.name}</p>
              <p className="text-sm text-gray-600">{formatSize(file.size)}</p>
            </div>
            <button type="button" className={btnSecondary} onClick={resetAll} disabled={locked || downloading} data-testid="button-csv-change-file">
              Choose another file
            </button>
          </div>

          {reading && (
            <div className="flex items-center gap-2 text-sm text-gray-700" role="status">
              <ProcessingSpinner size={18} /> Reading file in your browser
            </div>
          )}

          {(readError || parseError) && (
            <div role="alert" data-testid="csv-error" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {readError || parseError}
              {parseError && !readError && <span className="block mt-1">Try a different separator below if this is not the right one.</span>}
            </div>
          )}

          {(table || parseError) && phase !== "completed" && (
            <fieldset disabled={locked} className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="csv-settings">
              <legend className="mb-2 text-sm font-semibold text-gray-900">Settings</legend>
              <label className="block text-sm font-medium text-gray-800">
                Separator
                <select className={`${fieldCls} mt-1`} value={delimiter} onChange={(e) => setDelimiter(e.target.value as Delimiter)} data-testid="select-csv-delimiter">
                  {DELIMS.map((d) => <option key={d.label} value={d.value}>{d.label}</option>)}
                </select>
                {table && delimiter === "auto" && (
                  <span className="mt-1 block text-xs font-normal text-gray-600">Detected: {DELIM_NAMES[table.delimiter] ?? "comma"}</span>
                )}
              </label>
              <label className="block text-sm font-medium text-gray-800">
                Paper size
                <select className={`${fieldCls} mt-1`} value={paperSize} onChange={(e) => setPaperSize(e.target.value as "A4" | "Letter")} data-testid="select-csv-paper">
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-800">
                Orientation
                <select className={`${fieldCls} mt-1`} value={orientation} onChange={(e) => setOrientation(e.target.value as "landscape" | "portrait")} data-testid="select-csv-orientation">
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-800">
                Font size
                <select className={`${fieldCls} mt-1`} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value) as 8 | 10 | 12)} data-testid="select-csv-fontsize">
                  <option value={8}>8 pt</option>
                  <option value={10}>10 pt</option>
                  <option value={12}>12 pt</option>
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-gray-800 sm:col-span-2">
                <input type="checkbox" className="h-5 w-5 accent-[#f7433d]" checked={firstRowHeader} onChange={(e) => setFirstRowHeader(e.target.checked)} data-testid="checkbox-csv-header" />
                First row is a header
              </label>
            </fieldset>
          )}

          {table && (
            <section aria-labelledby="csv-preview-title" data-testid="csv-preview">
              <h2 id="csv-preview-title" className="text-base font-semibold text-gray-900">Preview</h2>
              <p className="mb-2 text-sm text-gray-600" data-testid="text-csv-preview-count">
                Showing the first {previewRows.length} of {table.rows.length} row{table.rows.length === 1 ? "" : "s"}, {table.columnCount} column{table.columnCount === 1 ? "" : "s"}. The whole file is converted.
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200" tabIndex={0} role="region" aria-label="CSV preview table, scrollable">
                <table className="min-w-full text-left text-sm">
                  <caption className="sr-only">Preview of {file.name}</caption>
                  {headRow && (
                    <thead className="bg-gray-100">
                      <tr>{headRow.map((c, i) => <th key={i} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold text-gray-900">{c}</th>)}</tr>
                    </thead>
                  )}
                  <tbody>
                    {bodyRows.map((r, ri) => (
                      <tr key={ri} className="border-t border-gray-100">
                        {r.map((c, ci) => <td key={ci} title={c} className="max-w-[16rem] truncate whitespace-nowrap px-3 py-2 text-gray-800">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gray-600" data-testid="text-csv-sections">
                {sections > 1
                  ? `This table has ${table.columnCount} columns, so it will be split into ${sections} printable column sections of up to ${limit} columns (${orientation}). The first original column repeats in each later section for context.`
                  : `All ${table.columnCount} columns fit on one printable section. Wider tables are grouped into sections of up to 8 columns in landscape or 5 in portrait, repeating the first column.`}
              </p>
            </section>
          )}

          {busy && (
            <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4" role="status" aria-live="polite" data-testid="status-csv-converting">
              <ConverterStatusIcon status="processing" size={56} />
              <div>
                <p className="font-semibold text-gray-900">Converting on our server</p>
                <p className="text-sm text-gray-600">Uploading your CSV and generating the PDF. Please keep this page open.</p>
              </div>
            </div>
          )}

          {phase === "failed" && (
            <div role="alert" data-testid="status-csv-failed" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">Conversion failed</p>
              <p>{error}</p>
              {loginNeeded && <Link href="/signin" className="mt-2 inline-block font-semibold underline">Log in</Link>}
            </div>
          )}

          {phase === "completed" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4" data-testid="status-csv-completed">
              <div className="flex items-center gap-3">
                <ConverterStatusIcon status="success" size={48} />
                <p className="font-semibold text-green-900">Your PDF is ready.</p>
              </div>
              {guestDownloaded && (
                <p className="mt-2 text-sm text-gray-700">
                  This guest result has been downloaded once.{" "}
                  <Link href="/signin" className="font-semibold underline">Sign in</Link> before your next conversion to keep results available for re-download.
                </p>
              )}
              {downloadError && <p role="alert" className="mt-2 text-sm text-red-700">{downloadError}</p>}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {phase !== "completed" && (
              <button type="button" className={btnPrimary} onClick={convert} disabled={!table || locked || isPaused} data-testid="button-csv-convert">
                {busy ? <><ProcessingSpinner size={16} tone="light" /> Converting</> : phase === "failed" ? <><RefreshCw className="h-4 w-4" /> Try again</> : "Convert to PDF"}
              </button>
            )}
            {phase === "completed" && (
              <>
                <button type="button" className={btnPrimary} onClick={download} disabled={downloading || guestDownloaded} data-testid="button-csv-download">
                  <Download className="h-4 w-4" />
                  {downloading ? "Downloading" : guestDownloaded ? "Downloaded" : "Download PDF"}
                </button>
            <button type="button" className={btnSecondary} onClick={resetAll} disabled={locked || downloading} data-testid="button-csv-reset">
                  <RotateCcw className="h-4 w-4" /> Convert another
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Preview is generated locally in your browser. Converting uploads the CSV to our server to build the PDF. See our{" "}
            <Link href="/privacy-policy" className="underline">privacy policy</Link>.
          </p>
        </div>
      )}
    </ToolPageShell>
  );
};

export default CsvToPdfUpload;
