import React from "react";
import { OptionGroup, QualitySlider, SettingsPanel } from "./OptionControls";

export type ImgFmt = "jpg" | "png" | "webp";

export const ImageOutputOptions: React.FC<{
  title: string;
  formats: ImgFmt[];
  format: ImgFmt;
  quality: number;
  onFormat: (f: ImgFmt) => void;
  onQuality: (q: number) => void;
  disabled?: boolean;
  note?: string;
}> = ({ title, formats, format, quality, onFormat, onQuality, disabled, note }) => (
  <SettingsPanel title={title}>
    <OptionGroup
      label="Output format" value={format} disabled={disabled} testIdPrefix="select-output-format"
      options={formats.map((f) => ({ value: f, label: f.toUpperCase() }))} onChange={onFormat}
    />
    <QualitySlider value={quality} onChange={onQuality} disabled={disabled} testId="input-quality" />
    {format === "png" && <p className="text-xs text-gray-500">PNG is lossless, so quality may have little or no effect on it.</p>}
    {note && <p className="text-xs text-gray-500">{note}</p>}
  </SettingsPanel>
);
