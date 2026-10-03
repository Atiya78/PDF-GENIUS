---
name: EAS build from the main agent
description: How to queue an EAS cloud build from the Replit main agent despite the git-write sandbox block.
---

# Running `eas build` from the main agent

`eas build` defaults to using git (it stashes/reads the index to create the upload archive). In the
EAS subprocess environment, git **writes** can be blocked, so the build aborts with an error about
`.git/index.lock` / "Destructive git operations are not allowed".

Do not assume this blocks all Git operations from the main agent: ordinary `git add` and `git rebase --continue` have succeeded through the shell tool.

**Fix:** prefix with `EAS_NO_VCS=1` so EAS tars the working directory directly instead of using git.
Run from the artifact dir, e.g.:

```
cd artifacts/pdf-convert-mobile && EAS_NO_VCS=1 eas build --platform android --profile production --non-interactive --no-wait
```

**Sandbox gotcha — `eas` is not a global binary and background builds get reaped:**
- There is no global `eas`; run via `npx eas-cli@latest …`. The npx *download* alone can exceed the 2-min bash cap (first call returns empty/-1).
- Backgrounding the build (`nohup`/`setsid … &`) does NOT survive — the detached process is killed when the bash tool's shell session ends (log freezes mid "Compressing project files", process gone, no build URL).
- **Working recipe:** (1) run `npx eas-cli@latest whoami` once just to populate the npx cache (`~/.npm/_npx/<hash>/node_modules/.bin/eas`); (2) then run the build in the FOREGROUND using that cached binary path within one 120s call. With eas-cli cached + node_modules gitignored, compress+upload+queue finishes in well under 2 min and prints the `expo.dev/.../builds/<id>` URL.

**Notes:**
- `--no-wait` queues and returns immediately (cloud build takes ~10-20 min); poll the printed
  `expo.dev/.../builds/<id>` URL.
- `appVersionSource: remote` in eas.json means EAS auto-increments versionCode remotely; the
  `android.versionCode` in app config is ignored for the build.
- Auth is via the `EXPO_TOKEN` secret (non-interactive); `eas whoami` confirms the account.
