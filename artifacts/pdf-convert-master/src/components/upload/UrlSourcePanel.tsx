import React from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionGroup, SettingsPanel, TextInput } from "./OptionControls";
import { validatePublicUrl } from "@/lib/publicUrlValidation";

export type HtmlInputMode = "file" | "url";

export function makeUrlSourceFile(url: string): File {
  const source = new URL(url);
  const escaped = source.href.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const html = `<!doctype html><meta charset="utf-8"><title>Source: ${source.hostname}</title><a href="${escaped}">${escaped}</a>\n`;
  return new File([html], `${source.hostname.replace(/[^a-z0-9.-]/gi, "-")}.html`, { type: "text/html" });
}

export const UrlSourcePanel: React.FC<{
  mode: HtmlInputMode;
  onMode: (m: HtmlInputMode) => void;
  url: string;
  onUrl: (u: string) => void;
  onSubmit: (url: string) => void;
}> = ({ mode, onMode, url, onUrl, onSubmit }) => {
  const [touched, setTouched] = React.useState(false);
  const err = url ? validatePublicUrl(url) : null;
  return (
    <div className="mx-auto mb-6 w-full max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <OptionGroup
        label="Source" value={mode} onChange={onMode} testIdPrefix="select-html-mode"
        options={[{ value: "file", label: "HTML file" }, { value: "url", label: "From URL" }]}
      />
      {mode === "url" && (
        <SettingsPanel title="Web page address">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (validatePublicUrl(url) === null) onSubmit(url.trim());
            }}
          >
            <label htmlFor="input-html-url" className="sr-only">Page URL</label>
            <TextInput
              id="input-html-url" type="url" value={url} placeholder="https://example.org/article" autoComplete="off"
              onChange={(e) => onUrl(e.target.value)} aria-invalid={touched && !!validatePublicUrl(url)} data-testid="input-html-url"
            />
            {(touched || err) && validatePublicUrl(url) && <p className="text-xs text-red-600" role="alert" data-testid="text-url-error">{validatePublicUrl(url)}</p>}
            <p className="text-xs text-gray-600">
              Public http:// or https:// pages only. Pages that need JavaScript or a login may not render as expected. JavaScript is not run, and the result may differ from what your browser shows.
            </p>
            <p className="text-xs text-gray-500">Hostnames are checked on the server when conversion starts. URL limits: 5 MB HTML, 2 MB per asset and 12 MB total.</p>
            <Button type="submit" className="w-full bg-[#f7433d] text-white hover:bg-[#e03a35]" data-testid="button-use-url">
              <Link2 className="mr-2 h-4 w-4" />Continue with this URL
            </Button>
          </form>
        </SettingsPanel>
      )}
    </div>
  );
};
