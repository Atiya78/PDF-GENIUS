---
name: Tawk support constraints
description: Owner-required delayed website chat and provider API constraints.
---
Keep website chat with delayed loading; the owner's explicit choice supersedes previous chat removal.

**Why:** support chat is required, but must not delay the first render or obscure file operations.

**How to apply:** delay until interaction or five seconds, suppress it in build snapshots, and preserve active file state on SDK failure.

For verified name/email attributes, Tawk requires a server-side HMAC of email with its private Secure Mode key. Its documented customStyle supports zIndex, not arbitrary position/yOffset.

**Why:** public widget IDs are not signing keys, and unsupported position properties are silently ineffective.

**How to apply:** authenticate the identity endpoint using the DB user; send only verified name/email/hash when chat opens. Position the fixed widget wrapper after onLoad. Never forward file state.