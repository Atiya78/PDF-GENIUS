import type { EducationNotes } from "@workspace/api-client-react";

export interface MapNode { id: string; label: string; children: MapNode[]; pages?: number[] }

const strip = (s: string) => s.replace(/\*\*|__|`/g, "").replace(/^\s*#+\s*/, "").trim();

/** Derives a tree from the generated hierarchy: title > section headings > nested outline list items. */
export function notesToTree(notes: EducationNotes): MapNode {
  const root: MapNode = { id: "root", label: notes.title, children: [] };
  notes.sections.forEach((s, si) => {
    const node: MapNode = { id: `s${si}`, label: strip(s.heading) || "Untitled", children: [], pages: s.sourcePages };
    const stack: { depth: number; node: MapNode }[] = [{ depth: -1, node }];
    let n = 0;
    for (const raw of s.body.split("\n")) {
      if (!raw.trim()) continue;
      const m = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/.exec(raw);
      const depth = m ? Math.floor(m[1].replace(/\t/g, "  ").length / 2) : 0;
      const label = strip(m ? m[2] : raw);
      if (!label) continue;
      while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
      const child: MapNode = { id: `${node.id}-${n++}`, label, children: [] };
      stack[stack.length - 1].node.children.push(child);
      stack.push({ depth, node: child });
    }
    root.children.push(node);
  });
  if (notes.takeaways.length) root.children.push({ id: "takeaways", label: "Key takeaways", children: notes.takeaways.map((t, i) => ({ id: `t${i}`, label: strip(t), children: [] })) });
  return root;
}
