---
name: Website navbar selection
description: PDF Genius navbar uses a single text-only active or interacted heading.
---

Show only one highlighted top-level navbar heading at a time. Use text color only: no selected/hover background, shadow or underline. Preserve a visible keyboard-focus outline.

**Why:** The owner explicitly reported Home and an opened tool menu appearing selected simultaneously and rejected the colored background.

**How to apply:** A hovered or keyboard-focused heading takes precedence over an open menu, which takes precedence over the current page. Closing the interaction restores the route's highlight. Tool routes belong to one category even when menus contain overlapping links.
