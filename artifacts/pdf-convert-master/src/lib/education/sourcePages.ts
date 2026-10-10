import type { EducationExtraction, EducationSourcePage } from "@workspace/api-client-react";
import type { SourceState } from "./useSource";

export type ExtractFn = (vars: { data: { file: File; pageRange?: string } }) => Promise<EducationExtraction>;

/** Reads the chosen source into in-memory pages. Nothing is persisted. */
export async function readSourcePages(src: SourceState, extract: ExtractFn, numbered = false, keepBlank = false): Promise<{ pages: EducationSourcePage[]; warnings: string[] }> {
  if (src.mode === "upload" && src.file) {
    const ex = await extract({ data: { file: src.file, pageRange: src.normalized || undefined } });
    if (!ex.pages.some((p) => p.text.trim())) throw new Error("No readable text was found in this PDF or page range.");
    // Blank numbered pages are real pages: the translator keeps them in order instead of dropping them.
    const pages = keepBlank ? ex.pages : ex.pages.filter((p) => p.text.trim());
    return { pages: numbered ? pages.map((p, i) => ({ ...p, pageNumber: p.pageNumber ?? i + 1 })) : pages, warnings: ex.warnings };
  }
  return { pages: [{ pageNumber: numbered ? 1 : null, text: src.text.trim() }], warnings: [] };
}
