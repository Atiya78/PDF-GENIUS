import { generateEducationSummary } from "@workspace/api-client-react";
import { NotesGeneratorTool } from "@/components/education/NotesGeneratorTool";

export function PdfSummarizerPage(): JSX.Element {
  return <NotesGeneratorTool cfg={{ toolId: "pdf-summarizer", seoTitle: "AI PDF Summarizer — Editable Chapter Summaries | PDF Genius", seoDescription: "Summarize a long PDF chapter into editable sections and key takeaways with source pages. Export PDF, DOCX or Markdown.", historyKind: "summary", noun: "summary", action: "Summarize", style: "summary", generate: generateEducationSummary }} />;
}
export default PdfSummarizerPage;
