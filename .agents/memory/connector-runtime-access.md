---
name: Connector runtime access
description: Attached connector metadata is not proof that the app runtime can use the connection.
---

Verify a real authenticated provider request before describing an attached AI integration as operational.

**Why:** On 2026-10-09 Replicate was listed as added, but the documented app SDK returned a customer-level missing-connection error, and the execution environment did not expose that connection for API calls. Replacing token extraction with the supported proxy did not resolve the binding issue.

**How to apply:** Keep credentials in the supported proxy, distinguish runtime binding failures from expired credentials or model failures, and report the actual blocker. Do not create duplicate connections or invent successful AI outputs from the integration's attached status alone.
