---
name: Conversion result retention
description: Approved retention scope, durable re-downloads and protected account data.
---

Stored conversion outputs and their OCR side data expire after 24 hours, including results that existed before this policy was introduced. Downloading a result does not itself delete the durable copy.

**Why:** On 2026-10-09 the owner explicitly approved permanent 24-hour deletion for existing and new results. This supersedes the earlier indefinite re-download policy. Durable copies still protect users from process restarts within the retention window.

**How to apply:** Limit automatic deletion to conversion result files and associated OCR side data. Preserve avatars, accounts, billing, usage records and conversion history. Expired downloads should explain that the user must convert again, not save an error response as a file. Provider-side retention is separate; never claim this cleanup controls third-party AI providers.
