import { createHash } from "node:crypto";
import type { EducationSourcePage } from "@workspace/api-zod";
import { EducationError } from "./config";
import { providerConfig } from "./ai";

export interface Passage { pageNumber: number; text: string }
const stop = new Set("a an the of in on to for and or is are was were be what why how which does do can explain describe tell me this that it as from with about কি কী কেন কিভাবে কীভাবে এবং এর এই একটি কোন হয় হয়".split(" "));
function tokens(text: string) {
  const matched: string[] = text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
  return matched
    .filter(token => token.length > 1 && !stop.has(token))
    .map(token => /^[a-z]{5,}$/.test(token) ? token.replace(/(?:ing|ed|s)$/, "") : token);
}
export function pdfPassages(pages: EducationSourcePage[]): Passage[] {
  if (pages.some(page => page.pageNumber === null)) throw new EducationError("Please upload a PDF to use page-cited Study Q&A.");
  const result: Passage[] = [];
  for (const page of pages) {
    for (let start = 0; start < page.text.length; start += 1300)
      result.push({ pageNumber: page.pageNumber!, text: page.text.slice(start, start + 1600) });
  }
  return result;
}
export function rankBm25(passages: Passage[], query: string, limit = 6): Passage[] {
  const words = [...new Set(tokens(query))].slice(0, 50), documents = passages.map(passage => tokens(passage.text));
  const average = documents.reduce((sum, words) => sum + words.length, 0) / Math.max(1, documents.length);
  const scores = documents.map(wordsInDoc => {
    let score = 0;
    for (const word of words) {
      const frequency = wordsInDoc.filter(token => token === word).length;
      const matching = documents.filter(document => document.includes(word)).length;
      const inverse = Math.log(1 + (documents.length - matching + 0.5) / (matching + 0.5));
      score += inverse * frequency * 2.2 / (frequency + 1.2 * (0.25 + 0.75 * wordsInDoc.length / Math.max(1, average)));
    }
    return score;
  });
  const ranked = passages.map((passage, index) => ({ passage, score: scores[index]! }))
    .sort((a, b) => b.score - a.score);
  // If wording has no keyword overlap, sample across the document rather than
  // implying no answer exists. The model must still prove its cited passage.
  if (!ranked.some(item => item.score > 0))
    return Array.from({ length: Math.min(limit, passages.length) }, (_, index) => passages[Math.floor(index * passages.length / Math.min(limit, passages.length))]!);
  return ranked.slice(0, limit).map(item => item.passage);
}

const vectors = new Map<string, { value: number[][]; expires: number; bytes: number }>();
const vectorSweep = setInterval(() => {
  for (const [key, value] of vectors) if (value.expires < Date.now()) vectors.delete(key);
}, 60_000);
vectorSweep.unref();
async function embed(input: string[], deadline: number): Promise<number[][] | undefined> {
  const { openrouter, key, base } = providerConfig();
  const model = process.env.EDUCATION_EMBEDDING_MODEL || (openrouter ? "openai/text-embedding-3-small" : "text-embedding-3-small");
  try {
    const response = await fetch(`${base}/embeddings`, {
      method: "POST", signal: AbortSignal.timeout(Math.max(1, Math.min(25_000, deadline - Date.now()))),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input, encoding_format: "float", ...(/text-embedding-3/.test(model) ? { dimensions: 512 } : {}) }),
    });
    if (!response.ok) return undefined; // Unsupported/unavailable embeddings use actual BM25, never invented data.
    const body = await response.json() as { data?: { index: number; embedding: number[] }[] };
    const data = body.data?.sort((a, b) => a.index - b.index);
    if (!data || data.length !== input.length || data.some((item, index) =>
      item.index !== index || !Array.isArray(item.embedding) || item.embedding.length < 1 || item.embedding.length > 4096 ||
      item.embedding.some(number => !Number.isFinite(number)) || item.embedding.every(number => number === 0) ||
      item.embedding.length !== data[0]!.embedding.length)) return undefined;
    return data.map(item => item.embedding);
  } catch { return undefined; }
}
function cosine(left: number[], right: number[]) {
  let dot = 0, a = 0, b = 0;
  for (let index = 0; index < left.length; index++) { dot += left[index]! * right[index]!; a += left[index]! ** 2; b += right[index]! ** 2; }
  return a && b ? dot / Math.sqrt(a * b) : 0;
}
export async function retrievePdf(pages: EducationSourcePage[], query: string, deadline: number) {
  const passages = pdfPassages(pages);
  const hash = createHash("sha256").update(JSON.stringify([process.env.EDUCATION_AI_PROVIDER, process.env.EDUCATION_AI_BASE_URL, process.env.EDUCATION_EMBEDDING_MODEL, pages])).digest("hex");
  const cached = vectors.get(hash);
  let matrix = cached && cached.expires > Date.now() ? cached.value : undefined;
  // On the first question, embed document and query in one bounded request.
  const response = await embed(matrix ? [query] : [...passages.map(passage => passage.text), query], deadline);
  if (!response) return { passages: rankBm25(passages, query), method: "bm25" as const };
  const queryVector = response[response.length - 1]!;
  if (!matrix) {
    matrix = response.slice(0, -1);
    const bytes = matrix.reduce((sum, vector) => sum + vector.length * 8, 0);
    while (vectors.size && [...vectors.values()].reduce((sum, value) => sum + value.bytes, 0) + bytes > 8 * 1024 * 1024)
      vectors.delete(vectors.keys().next().value!);
    if (bytes <= 8 * 1024 * 1024) vectors.set(hash, { value: matrix, expires: Date.now() + 15 * 60_000, bytes });
  }
  if (matrix.length !== passages.length || matrix[0]?.length !== queryVector.length)
    return { passages: rankBm25(passages, query), method: "bm25" as const };
  return { passages: passages.map((passage, index) => ({ passage, score: cosine(matrix![index]!, queryVector) }))
    .sort((a, b) => b.score - a.score).slice(0, 6).map(item => item.passage), method: "embeddings" as const };
}
