---
name: GitHub push authentication
description: Diagnose actual Git authentication, reconnect source-control OAuth, and handle push protection safely.
---

# GitHub push path

Check the current remote and a non-mutating `git push --dry-run` before assuming
an old authentication problem still applies. Do not print credentials embedded
in a remote URL.

The GitHub source-control connection authenticates workspace Git CLIs
automatically. When Git rejects its credentials, inspect its reauthorization
context and reconnect OAuth through the existing connection. A nominally healthy
connection status is not proof that Git authentication succeeds.

**Why:** Repository targets and connections have changed across sessions.
Older notes about permanently broken Git-pane authentication or available PATs
are not reliable evidence of the current state.

**How to apply:** Prefer source-control OAuth recovery before requesting a PAT.
If a PAT fallback is needed, verify its secret exists and use a temporary
GIT_ASKPASS script, never a token-bearing URL or a credential pasted in chat.
An authenticated ASKPASS dry run confirms this alternate push route; it does not
repair the Git pane's separate saved OAuth credential.

Unset `GIT_CURL_VERBOSE` and other Git trace variables for credentialed commands
rather than setting them to `"0"`.

**Why:** `GIT_CURL_VERBOSE=0` still enabled curl diagnostics during a credentialed
dry run; HTTP traces should not be included in user-facing authentication results.

**How to apply:** Remove trace variables from the child process environment and
print only sanitized Git result lines, never complete HTTP diagnostics.

Source-control connections can appear healthy/already attached while generic
integration authorization cards reject them as unconnected or lack a connector
identifier. This was observed on 2026-10-10.

**Why:** Git-provider connections are special objects, not necessarily ordinary
runtime integration connections that the generic reconnect form can handle.

**How to apply:** Do not repeat failing authorization cards. Use the Git pane's
own authorization controls or a secure repository-scoped PAT fallback, and
confirm success with a dry run before any actual push.

**Push protection:** the repo is push-protection eligible; any commit containing a
real secret (e.g. files like `attached_assets/0_secrets_*.json`) blocks the whole
push with GH013. Removing a secret from the latest file does not remove it from
earlier commits. Obtain consent before rewriting history; do not force-push.
`attached_assets/0_secrets_*` is gitignored — keep it that way.

**Why:** Generic GitHub API connectors are distinct from the source-control
connection and do not supply Git-over-HTTPS credentials.
