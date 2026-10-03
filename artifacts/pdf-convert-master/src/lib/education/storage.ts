import type { EducationDeck } from "@workspace/api-client-react";

export type Mark = "know" | "learning";
export interface SavedDeck { v: 1; deck: EducationDeck; marks: Record<string, Mark>; order: string[]; savedAt: number }
export const DECK_KEY = "pdfgenius.education.flashcards.v1";

export function loadSavedDeck(): SavedDeck | null {
  try {
    const raw = localStorage.getItem(DECK_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || p.v !== 1 || !p.deck || typeof p.deck.title !== "string" || !Array.isArray(p.deck.cards)) return null;
    const cards = p.deck.cards.filter((c: unknown) => {
      const x = c as { id?: unknown; front?: unknown; back?: unknown };
      return typeof x?.id === "string" && typeof x.front === "string" && typeof x.back === "string";
    }).map((c: { id: string; front: string; back: string; sourcePage?: unknown }) => ({ id: c.id, front: c.front, back: c.back, sourcePage: typeof c.sourcePage === "number" ? c.sourcePage : null }));
    const marks: Record<string, Mark> = {};
    for (const [k, v] of Object.entries(p.marks ?? {})) if (v === "know" || v === "learning") marks[k] = v;
    const order = Array.isArray(p.order) ? p.order.filter((x: unknown) => typeof x === "string") : [];
    return { v: 1, deck: { title: p.deck.title, cards }, marks, order, savedAt: Number(p.savedAt) || 0 };
  } catch { return null; }
}

/** Returns false when the browser refused to save (private mode, quota). */
export function saveDeck(s: SavedDeck): boolean {
  try { localStorage.setItem(DECK_KEY, JSON.stringify(s)); return true; } catch { return false; }
}
export function clearSavedDeck() { try { localStorage.removeItem(DECK_KEY); } catch { /* nothing to clear */ } }
