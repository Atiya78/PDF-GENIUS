import { Fragment, type ReactNode } from "react";
import { Link } from "wouter";
import { LEGAL_TOKENS } from "@/content/legal/company";

/**
 * Deliberately small Markdown subset for the legal pages (no dependency):
 * front matter, ## / ### headings, paragraphs, - and 1. lists, | tables |,
 * > callouts, **bold**, `code`, [links](/path). HTML comments (used for internal
 * "TODO: confirm" notes) are stripped and never rendered.
 */
export interface LegalDoc {
  meta: Record<string, string>;
  blocks: Block[];
  toc: { id: string; title: string }[];
}
type Block =
  | { t: "h2" | "h3"; text: string; id: string }
  | { t: "p" | "quote"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function parseLegal(raw: string): LegalDoc {
  let src = raw.replace(/<!--[\s\S]*?-->/g, "").replace(/\{\{(\w+)\}\}/g, (_, k) => LEGAL_TOKENS[k] ?? `{{${k}}}`);
  const meta: Record<string, string> = {};
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(src);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    src = src.slice(fm[0].length);
  }
  const blocks: Block[] = [];
  const toc: LegalDoc["toc"] = [];
  const lines = src.split("\n");
  let i = 0;
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      const text = h[2].trim(); const id = slug(text);
      if (h[1] === "##") { blocks.push({ t: "h2", text, id }); toc.push({ id, title: text }); } else blocks.push({ t: "h3", text, id });
      i++; continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(cells(lines[i])); i++; }
      const body = rows.slice(1).filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
      blocks.push({ t: "table", head: rows[0], rows: body });
      continue;
    }
    if (/^\s*-\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*-\s+/).test(lines[i])) {
        let item = lines[i].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*-\s+/, ""); i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) { item += " " + lines[i].trim(); i++; }
        items.push(item);
      }
      blocks.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }
    if (line.startsWith(">")) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) { parts.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push({ t: "quote", text: parts.join(" ") });
      continue;
    }
    const parts: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|\||>|\s*-\s|\s*\d+\.\s)/.test(lines[i])) { parts.push(lines[i].trim()); i++; }
    blocks.push({ t: "p", text: parts.join(" ") });
  }
  return { meta, blocks, toc };
}

export function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++} className="font-semibold text-[#1c1917]">{m[1]}</strong>);
    else if (m[2]) out.push(<code key={k++} className="edu-mono rounded bg-[#f1ebe1] px-1 py-0.5 text-[0.86em]">{m[2]}</code>);
    else {
      const href = m[4]; const label = m[3];
      out.push(href.startsWith("/")
        ? <Link key={k++} href={href} className="legal-a">{label}</Link>
        : <a key={k++} href={href} className="legal-a" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{label}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}

export function LegalBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h2": return <h2 key={i} id={b.id} className="legal-h2"><Inline text={b.text} /></h2>;
          case "h3": return <h3 key={i} id={b.id} className="legal-h3"><Inline text={b.text} /></h3>;
          case "p": return <p key={i} className="legal-p"><Inline text={b.text} /></p>;
          case "quote": return <p key={i} className="legal-note"><Inline text={b.text} /></p>;
          case "ul": return <ul key={i} className="legal-ul">{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>;
          case "ol": return <ol key={i} className="legal-ol">{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ol>;
          case "table": return (
            <div key={i} className="legal-table-wrap" role="region" aria-label="Table" tabIndex={0}>
              <table className="legal-table">
                <thead><tr>{b.head.map((h, j) => <th key={j} scope="col"><Inline text={h} /></th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, n) => <td key={n}><Inline text={c} /></td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
      })}
    </>
  );
}
