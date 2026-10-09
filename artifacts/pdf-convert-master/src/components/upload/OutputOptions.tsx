import React from "react";
import { OptionGroup, QualitySlider, SettingsPanel } from "./OptionControls";

export type ImgFmt = "jpg" | "png" | "webp" | "gif" | "bmp" | "tiff";

export const ImageOutputOptions: React.FC<{
  title: string;
  formats: ImgFmt[];
  format: ImgFmt;
  quality: number;
  onFormat: (f: ImgFmt) => void;
  onQuality: (q: number) => void;
  disabled?: boolean;
  note?: string;
  dpi?: number;
  onDpi?: (d: number) => void;
}> = ({ title, formats, format, quality, onFormat, onQuality, disabled, note, dpi, onDpi }) => (
  <SettingsPanel title={title}>
    <OptionGroup
      label="Output format" value={format} disabled={disabled} testIdPrefix="select-output-format"
      options={formats.map((f) => ({ value: f, label: f.toUpperCase() }))} onChange={onFormat}
    />
    {dpi !== undefined && onDpi && (
      <OptionGroup
        label="Resolution (DPI)" value={dpi} disabled={disabled} testIdPrefix="select-dpi" onChange={onDpi}
        options={[{ value: 72, label: "72", hint: "Screen" }, { value: 150, label: "150", hint: "Standard" }, { value: 300, label: "300", hint: "Print" }]}
      />
    )}
    {format === "jpg" || format === "webp" ? (
      <QualitySlider value={quality} onChange={onQuality} disabled={disabled} testId="input-quality" />
    ) : (
      <p className="text-xs text-gray-500">{format.toUpperCase()} is not a lossy format here, so there is no quality setting.</p>
    )}
    {note && <p className="text-xs text-gray-500">{note}</p>}
  </SettingsPanel>
);

export type CompressLevel = "low" | "medium" | "high";

export const CompressLevelOptions: React.FC<{
  level: CompressLevel;
  onLevel: (l: CompressLevel) => void;
  disabled?: boolean;
}> = ({ level, onLevel, disabled }) => (
  <SettingsPanel title="Compression level">
    <OptionGroup
      label="Level" value={level} disabled={disabled} testIdPrefix="select-compression-level" onChange={onLevel}
      options={[
        { value: "low", label: "Low", hint: "Best quality" },
        { value: "medium", label: "Medium", hint: "Balanced" },
        { value: "high", label: "High", hint: "Smallest file" },
      ]}
    />
    <p className="text-xs text-gray-500">Results depend on the file. If it cannot be reduced, the size comparison shows that honestly.</p>
  </SettingsPanel>
);
