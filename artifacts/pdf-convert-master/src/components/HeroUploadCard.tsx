import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { UploadIcon, ArrowRight, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { toolConfigs, getServerToolType, type ToolConfig } from "@/lib/toolConfig";
import { usePausedTools } from "@/lib/usePausedTools";
import { queueToolFiles } from "@/lib/toolFileHandoff";

const PRIORITY = [
  "merge-pdfs", "compress-pdf", "pdf-to-word", "split-pdf", "edit-pdf", "sign-pdf",
  "images-to-pdf", "unlock-pdf", "word-to-pdf", "pdf-to-images",
];

const extOf = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
};

const sizeLabel = (bytes: number): string =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const allTools = Object.values(toolConfigs).filter((t) => !t.comingSoon && t.route);
const acceptAttr = Array.from(new Set(allTools.flatMap((t) => t.acceptedFormats))).join(",");

/** The single primary upload on the home page. Picks a file, then asks what to do with it. */
export const HeroUploadCard = (): JSX.Element => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const paused = usePausedTools();

  const { matchFiles, tools } = useMemo(() => {
    if (files.length === 0) return { matchFiles: [] as File[], tools: [] as ToolConfig[] };
    let list = files;
    let found = allTools.filter((t) => list.every((f) => t.acceptedFormats.includes(extOf(f.name))));
    if (found.length === 0) {
      const first = extOf(files[0].name);
      list = files.filter((f) => extOf(f.name) === first);
      found = allTools.filter((t) => t.acceptedFormats.includes(first));
    }
    found = found
      .filter((t) => !paused.has(getServerToolType(t)))
      .sort((a, b) => {
        const ia = PRIORITY.indexOf(a.id);
        const ib = PRIORITY.indexOf(b.id);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
    return { matchFiles: list, tools: found };
  }, [files, paused]);

  const pick = (list: FileList | null) => {
    if (list && list.length > 0) setFiles(Array.from(list));
  };

  const reset = () => {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={acceptAttr}
      className="sr-only"
      tabIndex={-1}
      aria-label="Choose a file"
      data-testid="input-hero-file"
      onChange={(e) => pick(e.target.files)}
    />
  );

  if (files.length > 0) {
    const dropped = files.length - matchFiles.length;
    return (
      <Card className="flex flex-col w-full md:w-[584px] min-h-[405px] p-6 sm:p-8 bg-card rounded-3xl border-2 border-solid border-gray-200 shadow-sm" data-testid="card-hero-chooser">
        {input}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-xl">What do you want to do?</h2>
            <p className="mt-1 text-sm text-gray-600 truncate" data-testid="text-hero-file-name">
              {matchFiles[0]?.name}
              {matchFiles.length > 1 ? ` + ${matchFiles.length - 1} more` : ""}
              {matchFiles.length === 1 ? ` (${sizeLabel(matchFiles[0].size)})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            aria-label="Choose a different file"
            data-testid="button-hero-reset"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {dropped > 0 && (
          <p className="mt-2 text-xs text-gray-600">
            {dropped} file{dropped > 1 ? "s" : ""} of a different type {dropped > 1 ? "were" : "was"} left out.
          </p>
        )}

        {tools.length === 0 ? (
          <div className="mt-6 text-sm text-gray-700">
            <p>None of our tools accept this file type.</p>
            <Link href="/tools" className="mt-3 inline-flex min-h-[44px] items-center font-medium text-[#c62d27] underline">
              Browse all tools
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid max-h-[300px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.id}>
                  <Link
                    href={t.route as string}
                    onClick={() => queueToolFiles(t.id, matchFiles)}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-[#f7433d] hover:bg-[#fff5f4]"
                    data-testid={`link-hero-choose-${t.id}`}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-[#c62d27]" aria-hidden="true" />
                    <span className="text-sm font-medium text-gray-900">{t.title}</span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    );
  }

  return (
    <Card
      className={`flex flex-col w-full md:w-[584px] min-h-[405px] items-center justify-center p-8 sm:p-[50px] bg-card rounded-3xl border-2 border-dashed shadow-sm transition-colors ${
        dragging ? "border-[#f7433d] bg-[#fff5f4]" : "border-[#f7433d]/50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
      data-testid="card-hero-upload"
    >
      {input}
      <ConverterStatusIcon status="upload" size={80} className="mb-3" />
      <h2 className="font-bold text-gray-900 text-xl text-center mb-2">Drop a file here</h2>
      <p className="text-gray-600 text-base text-center mb-6">
        PDF, Word, Excel, PowerPoint, images and more. Then choose what to do with it.
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#d92f29] px-10 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-90"
        data-testid="button-hero-select-file"
        data-upload-action
      >
        <UploadIcon className="mr-2 h-5 w-5" aria-hidden="true" />
        Select a file
      </button>
      <p className="mt-5 text-xs text-gray-600 text-center">
        Your file stays in this tab until you pick a tool.
      </p>
    </Card>
  );
};
