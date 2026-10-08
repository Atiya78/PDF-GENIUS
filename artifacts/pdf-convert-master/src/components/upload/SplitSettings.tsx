import React, { useEffect, useRef } from "react";
import { OptionGroup, SettingsPanel, TextInput } from "./OptionControls";
import { PdfPageStatus } from "./PdfPageStatus";
import { parsePageRanges } from "./pageRanges";
import { usePdfInfo } from "./usePdfDocument";

export type SplitMode = "all" | "ranges" | "extract";

const HELP: Record<SplitMode, string> = {
  all: "Every page becomes its own PDF. You download a ZIP.",
  ranges: "Each comma-separated entry becomes a separate PDF inside a ZIP. 1-3,5,8-10 makes three PDFs.",
  extract: "The selected pages are combined into one PDF, in ascending page order.",
};

export const SplitSettings: React.FC<{
  file: File | undefined;
  mode: SplitMode;
  ranges: string;
  onMode: (m: SplitMode) => void;
  onRanges: (r: string) => void;
  onValidChange: (ok: boolean) => void;
  disabled?: boolean;
}> = ({ file, mode, ranges, onMode, onRanges, onValidChange, disabled }) => {
  const info = usePdfInfo(file);
  const count = info.status === "ready" ? info.pageCount : null;
  const parsed = parsePageRanges(ranges, count);
  const needsRanges = mode !== "all";
  const ok = info.status === "ready" && (!needsRanges || parsed.ok);
  const cb = useRef(onValidChange);
  cb.current = onValidChange;
  useEffect(() => { cb.current(ok); }, [ok]);

  return (
    <SettingsPanel title="Split mode">
      <PdfPageStatus info={info} />
      <OptionGroup
        label="How to split" value={mode} disabled={disabled} testIdPrefix="select-split-mode" onChange={onMode}
        options={[
          { value: "all", label: "Every page" },
          { value: "ranges", label: "By ranges" },
          { value: "extract", label: "Extract pages" },
        ]}
      />
      <p className="text-xs text-gray-600" data-testid="text-split-output">{HELP[mode]}</p>
      {needsRanges && (
        <div className="space-y-2">
          <label htmlFor="input-ranges" className="block text-sm font-medium text-gray-900">
            {mode === "ranges" ? "Page ranges" : "Pages to extract"}
          </label>
          <TextInput
            id="input-ranges" value={ranges} disabled={disabled} inputMode="text" autoComplete="off"
            placeholder="1-3,5,8-10" onChange={(e) => onRanges(e.target.value)}
            aria-invalid={!!ranges && !parsed.ok} aria-describedby="ranges-msg" data-testid="input-ranges"
          />
          <p id="ranges-msg" role={ranges && !parsed.ok ? "alert" : undefined} className={`text-xs ${ranges && !parsed.ok ? "text-red-600" : "text-gray-500"}`} data-testid="text-ranges-feedback">
            {!ranges ? "Use page numbers and ranges separated by commas." : parsed.ok
              ? mode === "ranges" ? `${parsed.tokens.length} PDF${parsed.tokens.length === 1 ? "" : "s"} will be created.` : `${parsed.pages.length} page${parsed.pages.length === 1 ? "" : "s"} selected.`
              : parsed.error}
          </p>
        </div>
      )}
    </SettingsPanel>
  );
};
