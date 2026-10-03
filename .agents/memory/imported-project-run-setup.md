---
name: Imported project run setup (PDF Genius)
description: How to get this imported monorepo running on a fresh Replit env — secrets, workflows, ports, and registry quirks.
---

# Getting the imported repo running on a fresh Replit env

When this project is freshly imported (cloned from GitHub), the artifact registry callbacks
(`listArtifacts`, `presentArtifact`, `screenshot` app_preview) return EMPTY / "Artifact not found"
even though `.replit-artifact/artifact.toml` files exist for every artifact. An empty registry also
makes the workspace **preview pane render blank/white** (nothing for it to resolve), even though the
server is fully healthy and `https://$REPLIT_DEV_DOMAIN/` returns valid 200 HTML.

**Why:** the platform's artifact registry isn't synced to the on-disk `artifact.toml` after a raw import.

**Fix (the registry CAN be re-synced — do this, don't work around it):** `restart_workflow` the web
workflow ("Start application"). The restart triggers the platform to re-scan `artifact.toml` and
repopulate the registry — `listArtifacts` then returns all artifacts, the preview pane resolves the
web app at `/`, and `screenshot` app_preview works (artifact_dir_name `pdf-convert-master`). This
supersedes the old "don't burn time" advice. Symptom that points here: blank preview + curl 200 +
NO browser console logs + `listArtifacts` empty.

**How to run it:** there are NO workflows on import. Configure them manually, and inject `PORT` inline
(the artifact system normally injects it from `localPort`, but manual `configureWorkflow` does not — the
api-server and vite both hard-fail / mis-bind without it):
- API Server: `PORT=8080 pnpm --filter @workspace/api-server run dev` (console, waitForPort 8080) — localPort 8080, serves `/api`.
- Web: `PORT=21027 BASE_PATH=/ pnpm --filter @workspace/pdf-convert-master run dev` (webview, waitForPort 21027) — localPort 21027, serves `/`.
Verify via `https://$REPLIT_DEV_DOMAIN/` (200) and `/api/health` (JSON), not the screenshot tool.

# Credentials on a fresh import

Imported non-secret settings do not imply that external service credentials were imported. Inspect the current environment and source for the active providers rather than relying on an old credential inventory.

**Why:** public defaults can survive an import while the private database, storage, email, and billing credentials do not. API health may succeed through a development fallback without proving access to the original account data.

**How to apply:** request missing credentials through the secure environment flow and check supported integrations first. Preserve the existing database and storage providers; see the Supabase and Railway storage memory topics for the product's decisions.

# Firewall-blocked lock entries

A parent package patch upgrade can still retain a blocked transitive version if the parent's accepted range has not changed.

**Why:** during import setup, pnpm reused a blocked child lock entry even after upgrading its parent within the existing SDK major.

**How to apply:** check the resolved child version, not just the parent's version. Refresh eligible transitive lock entries explicitly, keep the existing SDK major, and check the safe replacement tools' Node engine requirements. Never bypass the package firewall.

# Manual workflows collide with platform-managed ones (after registry sync)
Once the artifact registry syncs (artifacts appear in `listArtifacts`), the platform auto-creates its
OWN workflows from each `artifact.toml` (named `artifacts/<slug>: <service>`). If you earlier made
manual workflows on the same ports, both fight for 8080/21027/24364 → `EADDRINUSE` / "Port already in use".
Fix: REMOVE the manual workflows and let the platform-managed ones own the ports; don't run both.

**Orphan-process trap:** `removeWorkflow` can report `wasRunning:false` yet leave the dev process alive
as an orphan still holding the port. WORSE: `lsof -i :PORT` / `lsof -ti` sees NOTHING for these ports in
this sandbox (false "port free"), so killing by lsof is useless. Find orphans with
`ps -eo pid,ppid,etime,args | rg -i "vite|expo start|dist/index.mjs"` and `kill -9 <pid>` by PID, then
restart the platform workflows. Verify with curl to the dev domain (502 = port truly freed), not lsof.

# Health-check path mismatch
The real route is `GET /api/health`; `pdf-convert-master`/api-server `artifact.toml` production health
startup points at `/api/healthz` (404). Railway prod uses its dashboard health config, so this only
bites a Replit-native deploy. Fix the toml path or add a `/api/healthz` alias if deploying on Replit.
