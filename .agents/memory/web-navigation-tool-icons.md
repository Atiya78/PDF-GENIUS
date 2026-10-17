---
name: Uploaded icons in website navigation
description: The owner's requirement for tool icons in PDF Genius navigation and search.
---

Website tool entries must use the uploaded per-tool animation in desktop dropdowns, mobile click menus, navigation search, homepage Education shortcuts and post-upload tool choices, not separate generic Lucide symbols.

**Why:** The owner explicitly said that showing uploaded icons only on tool cards/pages was insufficient: hovering or clicking navigation content must show the same uploaded tool identity. They also flagged the homepage Education shortcut buttons after those were missed.

**How to apply:** Reuse the shared tool-icon renderer and its animation registry on new navigation surfaces. Keep normal non-tool navigation symbols and real processing/status animations distinct.
