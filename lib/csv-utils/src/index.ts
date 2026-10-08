import { parse } from "csv-parse/browser/esm/sync";

export const CSV_MAX_BYTES = 5 * 1024 * 1024;
export type CsvDelimiter = "auto" | "," | ";" | "\t" | "|";
export interface CsvTable { rows: string[][]; columnCount: number; delimiter: string; }

export function decodeCsv(bytes: Uint8Array): string {
  if (bytes.length > CSV_MAX_BYTES) throw new Error("Choose a CSV file no larger than 5 MB.");
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le"
    : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    if (text.includes("\0")) throw new Error("binary");
    return text;
  } catch {
    throw new Error("This file is not readable CSV text. Save it as UTF-8 CSV and try again.");
  }
}

function detectDelimiter(text: string): string {
  const choices = [",", ";", "\t", "|"];
  const counts: number[][] = [];
  let current = [0, 0, 0, 0], quoted = false;
  for (let i = 0; i < text.length && counts.length < 20; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { i++; continue; }
      quoted = !quoted;
    } else if (!quoted) {
      const index = choices.indexOf(c);
      if (index >= 0) current[index]++;
      if (c === "\n" || c === "\r") {
        if (current.some(Boolean)) counts.push(current);
        current = [0, 0, 0, 0];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    }
  }
  if (current.some(Boolean)) counts.push(current);
  const scores = choices.map((_, index) => {
    const values = counts.map(row => row[index]).filter(Boolean);
    if (!values.length) return 0;
    const frequency = new Map<number, number>();
    values.forEach(n => frequency.set(n, (frequency.get(n) ?? 0) + 1));
    return Math.max(...frequency.values()) / counts.length * 100 +
      values.reduce((a, b) => a + b, 0) / values.length;
  });
  return choices[scores.indexOf(Math.max(...scores))];
}

export function parseCsv(text: string, delimiter: CsvDelimiter = "auto"): CsvTable {
  if (!["auto", ",", ";", "\t", "|"].includes(delimiter)) throw new Error("Choose a supported CSV separator.");
  if (!text.trim()) throw new Error("This CSV file is empty. Choose a file containing data.");
  if (text.includes("\0")) throw new Error("This file contains binary data, not CSV text.");
  const selected = delimiter === "auto" ? detectDelimiter(text) : delimiter;
  let rows: string[][];
  try {
    rows = parse(text, {
      delimiter: selected, bom: true, skip_empty_lines: true, relax_column_count: true,
      cast: false, max_record_size: 65536, to: 10001,
    }) as string[][];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid CSV";
    if (message.includes("Max Record Size")) throw new Error("A CSV row is too large. Limit each row to 64 KB.");
    throw new Error("The CSV has invalid quoting or an incomplete row. Check the file and separator, then try again.");
  }
  if (!rows.length) throw new Error("This CSV file contains no rows.");
  const columnCount = Math.max(...rows.map(row => row.length));
  if (rows.length > 10000 || columnCount > 50 || rows.length * columnCount > 100000)
    throw new Error("This table is too large. Use at most 10,000 rows, 50 columns and 100,000 cells.");
  if (rows.some(row => row.some(cell => cell.length > 10000)))
    throw new Error("A cell is too long. Limit each cell to 10,000 characters.");
  // Preserve every value as text (including leading zeroes, dates and formulas).
  // Shorter records get blank trailing cells, never a shifted or discarded value.
  return { rows: rows.map(row => [...row, ...Array(columnCount - row.length).fill("")]), columnCount, delimiter: selected };
}
