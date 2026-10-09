---
name: Connector runtime access
description: Attached connector metadata is not proof that the app runtime can use the connection.
---

Verify a real authenticated provider request before describing an attached AI integration as operational.

**Why:** On 2026-10-09 Replicate was listed as added, but the documented app SDK returned a customer-level missing-connection error, and the execution environment did not expose that connection for API calls. Replacing token extraction with the supported proxy did not resolve the binding issue.

**How to apply:** Keep credentials in the supported proxy, distinguish runtime binding failures from expired credentials or model failures, and report the actual blocker. Do not create duplicate connections or invent successful AI outputs from the integration's attached status alone.

An explicitly rejected direct key must not hide a working attached connection. Preserve direct-key support for external deployments, and only retry prediction creation through another authentication source after an explicit authentication rejection.

**Why:** A working Replicate connection authenticated successfully while the project's explicit key was rejected; key precedence prevented the usable connection from being used. Production runs on Railway and still needs a direct-key path. Retrying after an ambiguous network failure could create duplicate charged predictions.

**How to apply:** Test the key and connector independently. A 401 is eligible for connector fallback in a Replit-managed runtime; timeouts, rate limits and provider/server failures are not. Do not assume successful Replit connector access verifies external production credentials.
