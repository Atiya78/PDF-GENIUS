import data from "./toolLandingData.json";

export interface ToolLandingPageData {
  id: string;
  path: string;
  name: string;
  title: string;
  description: string;
  why: string;
  steps: string[];
  faqs: { question: string; answer: string }[];
  related: { path: string; name: string }[];
  legacyPath: string;
}

export const toolLandingPages: ToolLandingPageData[] = data.map((tool) => ({
  ...tool,
  legacyPath: `/upload/${tool.id}`,
  faqs: [
    ...tool.faqs.map(([question, answer]) => ({ question, answer })),
    {
      question: `Where does ${tool.name} process my file?`,
      answer: tool.processing === "browser"
        ? `${tool.name} processes the file in your browser; the file is not uploaded for processing.`
        : tool.processing === "optional"
          ? `${tool.name} processes the image locally. A separate optional Upload action sends the image to the server for temporary storage.`
          : `${tool.name} uploads the input to the server for processing. Conversion results are stored for re-download until deleted; the memory cleanup timer does not delete stored results. See the Privacy Policy for current retention details.`,
    },
  ],
  related: tool.related.map((id) => {
    const related = data.find((entry) => entry.id === id);
    if (!related) throw new Error(`Unknown related tool: ${id}`);
    return { path: related.path, name: related.name };
  }),
}));

export function canonicalToolPath(id: string): string {
  if (id === "restore-document") return "/restore-document";
  return toolLandingPages.find((page) => page.id === id)?.path ?? `/upload/${id}`;
}