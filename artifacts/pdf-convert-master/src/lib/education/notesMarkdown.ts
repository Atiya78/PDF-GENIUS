// Strict-whitelist conversion of editor DOM to limited Markdown. Raw HTML is never stored.
const BLOCK = new Set(["P", "DIV", "UL", "OL", "H1", "H2", "H3", "H4", "LI"]);
const clean = (s: string) => s.replace(/\u00a0/g, " ");

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return clean(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const inner = Array.from(el.childNodes).map(inline).join("");
  switch (el.tagName) {
    case "BR": return "\n";
    case "STRONG": case "B": return inner.trim() ? `**${inner.trim()}**` : inner;
    case "EM": case "I": return inner.trim() ? `*${inner.trim()}*` : inner;
    case "CODE": return inner.trim() ? `\`${inner.replace(/`/g, "")}\`` : inner;
    default: return inner;
  }
}

function walk(container: Node, out: string[], depth = 0) {
  let buf = "";
  const flush = () => { if (buf.trim()) out.push(buf.trim()); buf = ""; };
  for (const n of Array.from(container.childNodes)) {
    if (n.nodeType === Node.ELEMENT_NODE && BLOCK.has((n as HTMLElement).tagName)) {
      const el = n as HTMLElement;
      flush();
      if (el.tagName === "UL" || el.tagName === "OL") {
        const styledDepth = Math.min(6, Math.floor((parseFloat(el.style.marginLeft) || 0) / 12));
        const level = Math.max(depth, styledDepth);
        for (const [i, li] of Array.from(el.children).filter(c => c.tagName === "LI").entries()) {
          const direct = Array.from(li.childNodes).filter(n => !(n.nodeType === Node.ELEMENT_NODE && ["UL", "OL"].includes((n as HTMLElement).tagName)));
          const value = direct.map(inline).join("").replace(/\s*\n\s*/g, " ").trim();
          if (value) out.push(`${"  ".repeat(level)}${el.tagName === "OL" ? `${i + 1}.` : "-"} ${value}`);
          for (const child of Array.from(li.children).filter(n => ["UL", "OL"].includes(n.tagName))) {
            const wrapper = document.createElement("div"); wrapper.appendChild(child.cloneNode(true)); walk(wrapper, out, Math.min(6, level + 1));
          }
        }
      } else if (/^H[1-4]$/.test(el.tagName)) {
        const t = inline(el).trim(); if (t) out.push(`${"#".repeat(Math.max(1, Math.min(3, Number(el.tagName.slice(1)) - 1)))} ${t}`);
      } else if (el.querySelector("ul,ol,div,p")) walk(el, out, depth);
      else { const t = inline(el).trim(); if (t) out.push(t); }
    } else buf += inline(n);
  }
  flush();
}

export function domToMarkdown(root: HTMLElement): string {
  const out: string[] = [];
  walk(root, out);
  return out.join("\n\n").trim();
}
