---
name: AI upscaling output contract
description: Preserve scale choices, honest AI scaling, completed-result ownership and durable delivery across provider changes.
---

Preserve the existing 2× and 4× choices when changing the AI upscaling engine. If a model only generates 4×, derive 2× from its actual AI result and disclose that resize rather than implying native 2× inference.

**Why:** Aura SR v2 was specifically requested, but removing the existing 2× choice would break the established tool behavior. Provider-native processing size still determines safety limits even when the final export is smaller.

**How to apply:** Enforce pixel limits using the model's native scale. Track completed-result scale separately from the next requested scale so changing a selection never destroys or mislabels an already-generated file.

Do not return temporary Replicate delivery URLs as the application's download contract.

**Why:** Provider files expire independently of the app's 24-hour retention and would bypass owned-download access checks.

**How to apply:** Read the official SDK's file URL, retrieve the real bytes, and use the existing first-party result storage/download flow. Match the actual output format, MIME and filename.
