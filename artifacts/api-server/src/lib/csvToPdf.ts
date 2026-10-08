import { decodeCsv, parseCsv, type CsvDelimiter } from "@workspace/csv-utils";
import { readFile } from "node:fs/promises";

export interface CsvPrintOptions {
  format: "A4" | "Letter";
  landscape: boolean;
  displayHeaderFooter: boolean;
  headerTemplate: string;
  footerTemplate: string;
}
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]!));

export async function buildCsvPdf(
  bytes: Uint8Array, filename: string, options: Record<string, unknown> = {},
): Promise<{ html: string; print: CsvPrintOptions }> {
  const delimiter = options.delimiter ?? "auto";
  if (typeof delimiter !== "string") throw new Error("Choose a supported CSV separator.");
  const table = parseCsv(decodeCsv(bytes), delimiter as CsvDelimiter);
  const paperSize = options.paperSize ?? "A4";
  const orientation = options.orientation ?? "landscape";
  const fontSize = options.fontSize ?? 10;
  const header = options.firstRowHeader ?? true;
  if (paperSize !== "A4" && paperSize !== "Letter") throw new Error("Choose A4 or Letter paper.");
  if (orientation !== "landscape" && orientation !== "portrait") throw new Error("Choose portrait or landscape orientation.");
  if (![8, 10, 12].includes(fontSize as number)) throw new Error("Choose an 8, 10 or 12 point font.");
  if (typeof header !== "boolean") throw new Error("The first-row header option must be true or false.");
  const landscape = orientation === "landscape";
  const groupWidth = landscape ? 8 : 5;
  const groups: number[][] = [];
  for (let offset = 0; offset < table.columnCount;) {
    const repeated = offset > 0 ? [0] : [];
    const count = Math.min(groupWidth - repeated.length, table.columnCount - offset);
    groups.push([...repeated, ...Array.from({ length: count }, (_, index) => offset + index)]);
    offset += count;
  }
  const headings = header ? table.rows[0] : Array.from({ length: table.columnCount }, (_, i) => `Column ${i + 1}`);
  const data = header ? table.rows.slice(1) : table.rows;
  let fontCss = "";
  if (/[\u0980-\u09ff]/.test(table.rows.flat().join(""))) {
    const font = await readFile(new URL("../education/assets/NotoSansBengali.ttf", import.meta.url))
      .catch(() => readFile(new URL("../src/education/assets/NotoSansBengali.ttf", import.meta.url)));
    fontCss = `@font-face{font-family:CsvBengali;src:url(data:font/ttf;base64,${font.toString("base64")}) format('truetype');font-weight:100 900}`;
  }
  const title = filename.replace(/\.[^.]+$/, "") || "CSV table";
  const sections = groups.map((columns, group) => `<section>
    <h1>${escape(title)}</h1>
    <p class="meta">${data.length.toLocaleString("en-US")} data rows · ${table.columnCount} columns${
      groups.length > 1 ? ` · Column section ${group + 1} of ${groups.length} (first column repeated for reference)` : ""
    }</p>
    <table><thead><tr>${columns.map(i => `<th scope="col">${escape(headings[i] ?? "")}</th>`).join("")}</tr></thead>
    <tbody>${data.map(row => `<tr>${columns.map(i => `<td>${escape(row[i])}</td>`).join("")}</tr>`).join("")}</tbody></table>
  </section>`).join("");
  return {
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
      body{font-family:Arial,CsvBengali,sans-serif;color:#17212f;font-size:${fontSize}pt;margin:0}
      h1{font-size:17pt;margin:0 0 6pt;overflow-wrap:anywhere}
      .meta{font-size:9pt;color:#586174;margin:0 0 14pt}
      section+section{break-before:page}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      thead{display:table-header-group}
      th,td{border:0.5pt solid #dfe3e9;padding:6pt;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}
      th{background:#edf0f4;font-weight:700;text-align:left}
      tbody tr:nth-child(even){background:#f8f9fb}
      tr{break-inside:avoid}
    </style></head><body>${sections}</body></html>`,
    print: {
      format: paperSize, landscape, displayHeaderFooter: true, headerTemplate: "<span></span>",
      footerTemplate: '<div style="width:100%;text-align:center;font:9px Arial;color:#687386;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    },
  };
}
