import { generateEducationMindMap } from "@workspace/api-client-react";
import { NotesGeneratorTool } from "@/components/education/NotesGeneratorTool";

export function MindMapPage(): JSX.Element {
  return <NotesGeneratorTool cfg={{ toolId: "mind-map", seoTitle: "Mind Map from PDF — Expandable Topic Tree | PDF Genius", seoDescription: "Turn a PDF chapter into an expandable mind map tree built from a real topic hierarchy. Edit the outline and export PDF, DOCX or Markdown.", historyKind: "mindmap", noun: "mind map", action: "Make Mind Map", style: "mind-map", generate: generateEducationMindMap, tree: true }} />;
}
export default MindMapPage;
