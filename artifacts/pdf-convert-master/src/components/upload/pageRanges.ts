export interface RangeResult {
  ok: boolean;
  error?: string;
  /** Normalised tokens as entered, whitespace stripped. */
  tokens: string[];
  /** Unique 1-based pages covered. */
  pages: number[];
  normalized: string;
}

/** Strict parser: "1-3,5,8-10". No clamping, reordering or auto-correction. */
export function parsePageRanges(input: string, pageCount: number | null): RangeResult {
  const fail = (error: string): RangeResult => ({ ok: false, error, tokens: [], pages: [], normalized: "" });
  const text = input.replace(/\s+/g, "");
  if (!text) return fail("Enter at least one page or range, for example 1-3,5,8-10.");
  const tokens = text.split(",");
  const pages = new Set<number>();
  for (const t of tokens) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(t);
    if (!m) return fail(t ? `"${t}" is not valid. Use page numbers or ranges like 3 or 4-7, separated by commas.` : "Remove empty entries between commas.");
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    if (a < 1 || b < 1) return fail(`Page numbers start at 1 ("${t}").`);
    if (a > b) return fail(`"${t}" runs backwards. Write it as ${b}-${a}.`);
    if (pageCount !== null && b > pageCount) return fail(`"${t}" is outside this PDF, which has ${pageCount} page${pageCount === 1 ? "" : "s"}.`);
    for (let p = a; p <= b; p++) pages.add(p);
  }
  return { ok: true, tokens, pages: [...pages].sort((x, y) => x - y), normalized: tokens.join(",") };
}

export function pagesToRangeString(pages: number[]): string {
  const s = [...new Set(pages)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${s[i]}-${s[j]}` : `${s[i]}`);
    i = j + 1;
  }
  return out.join(",");
}
