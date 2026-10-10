import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { EducationNotes } from "@workspace/api-client-react";
import { notesToTree, type MapNode } from "@/lib/education/mindMapTree";

function collectIds(n: MapNode, out: string[] = []) { if (n.children.length) { out.push(n.id); n.children.forEach((c) => collectIds(c, out)); } return out; }

function Branch({ node, open, toggle, level }: { node: MapNode; open: Set<string>; toggle: (id: string) => void; level: number }) {
  const has = node.children.length > 0;
  const isOpen = open.has(node.id);
  const tone = level === 0 ? "bg-[#f7433d] text-white font-semibold" : level === 1 ? "bg-[#fff1f0] text-gray-900 font-semibold ring-1 ring-[#f7433d]/30" : "bg-white text-gray-800 ring-1 ring-gray-200";
  return (
    <li role="treeitem" aria-expanded={has ? isOpen : undefined} aria-level={level + 1}>
      <div className="flex items-start gap-1.5 py-1">
        {has ? <button type="button" onClick={() => toggle(node.id)} aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.label}`} className="mt-1.5 shrink-0 rounded p-0.5 text-gray-600 hover:bg-gray-100" data-testid={`button-toggle-${node.id}`}>{isOpen ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}</button> : <span className="mt-1.5 inline-block h-5 w-5 shrink-0" />}
        <span className={`rounded-lg px-3 py-1.5 text-sm ${tone}`}>{node.label}{node.pages && node.pages.length > 0 && <span className="ml-2 text-xs font-normal opacity-70">p. {node.pages.join(", ")}</span>}</span>
      </div>
      {has && isOpen && <ul role="group" className="ml-3 border-l-2 border-[#f7433d]/20 pl-3">{node.children.map((c) => <Branch key={c.id} node={c} open={open} toggle={toggle} level={level + 1} />)}</ul>}
    </li>
  );
}

export function MindMapTree({ notes }: { notes: EducationNotes }) {
  const tree = useMemo(() => notesToTree(notes), [notes]);
  const all = useMemo(() => collectIds(tree), [tree]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(["root"]));
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const btn = "rounded-full border bg-white px-3 py-1.5 text-sm font-semibold";
  return (
    <div data-testid="tree-mind-map">
      <div className="mb-3 flex gap-2">
        <button type="button" className={btn} onClick={() => setOpen(new Set(all))} data-testid="button-expand-all">Expand all</button>
        <button type="button" className={btn} onClick={() => setOpen(new Set(["root"]))} data-testid="button-collapse-all">Collapse all</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
        <ul role="tree" aria-label="Mind map"><Branch node={tree} open={open} toggle={toggle} level={0} /></ul>
      </div>
    </div>
  );
}
