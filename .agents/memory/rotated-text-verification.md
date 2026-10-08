---
name: Rotated PDF text verification
description: Whitespace-sensitive checks can misdiagnose retained Bangla text as lost after splitting or rotation.
---

For text-retention checks on rotated pages, normalize layout whitespace and compare against the source page; also inspect the rendered result.

**Why:** During real Bangla PDF verification, the text extractor inserted line breaks inside a word on a 90-degree page even though the glyph content was retained. A literal substring check incorrectly reported a split failure.

**How to apply:** Keep output-page count, selection, ordering and rotation assertions strict. Normalize only extraction layout whitespace; never suppress missing characters or replace actual output with expected text.
