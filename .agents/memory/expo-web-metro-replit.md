---
name: Expo web + Metro on Replit
description: Non-obvious quirks when running an Expo artifact's web bundle in the Replit workspace (Metro cache, lazy bundling, log staleness, lottie web peer, asset exts).
---

# Expo web + Metro on Replit

## Metro cache is not busted by a plain workflow restart
`restart_workflow "<expo workflow>"` restarts the process but does NOT clear Metro's
persistent caches at `/tmp/metro-cache` and `/tmp/metro-file-map-*`. After changes that
affect module resolution (metro.config.js, added/removed deps, asset requires), the old
resolution/error can persist. Fix: `rm -rf /tmp/metro-cache /tmp/metro-file-map-*` then restart.

**Why:** a stale `.txt` asset-resolution failure survived several config edits + restarts until
the cache dirs were deleted; only then did the corrected source bundle.

## Metro bundles lazily — workflow logs can show STALE errors
The web bundle is built on first request, not on start. The workflow log file may keep showing
a pre-edit bundling error (old line numbers/source) until a fresh request triggers a rebundle.
Trust a freshly-triggered bundle, not the last log line.

## Verify the bundle on the Expo dev domain, not localhost:80
`localhost:80` (the shared proxy) returns an HTML/Vite wrapper for the expo artifact, so curling
`entry.bundle` there is misleading (200 + HTML). Hit `https://$REPLIT_EXPO_DEV_DOMAIN/...entry.bundle?...`
directly to see Metro's real status (e.g. 500 + JSON `UnableToResolveError`).
**How to apply:** when a screenshot shows blank white + a 500 on `entry.bundle`, fetch the exact
browser bundle URL on `$REPLIT_EXPO_DEV_DOMAIN` to read the real error body.

## `expo start` blocks on an interactive login prompt → iOS/native bundle never serves → device "request timeout"
On Replit the workflow runs `expo start` in a pseudo-TTY. When not logged into an Expo
account it shows `It is recommended to log in with your Expo account before proceeding`
(Log in / Proceed anonymously) and WAITS for arrow-key input. Metro then only builds the
web bundle; it never serves the native bundle, so an iOS/Android device hitting the
`exp://…expo.sisko.replit.dev` URL just times out. Fix: prepend `EXPO_OFFLINE=1` to the
`dev` script's `expo start` command — offline mode skips the account check (and dependency
validation), so startup is non-interactive and native bundling proceeds.
**Why:** the timeout looks like a network/proxy problem but is really the CLI blocked on a prompt.
**How to apply:** edit the `dev` script in the Expo artifact's `package.json`, then restart the
workflow. The benign `Offline and no cached development certificate found, unable to sign manifest`
line is fine — Expo Go loads unsigned dev manifests; iOS bundling starting confirms it connected.

## lottie-react-native@7 web build needs an optional peer
Its `index.web.js` imports `@lottiefiles/dotlottie-react` (optional peerDep). Without it the web
bundle fails to resolve. Install `@lottiefiles/dotlottie-react` into the Expo artifact for web.

## Do not require() non-default asset extensions in Metro
`require("...x.txt")` breaks the bundle — `.txt` isn't in Metro's default `assetExts`. Generate such
content at runtime (expo-file-system) instead of bundling it. PDF/PNG resolve fine by default.
Bundled samples that ARE wanted can be loaded via `expo-asset` (`Asset.fromModule(require(...))`,
`downloadAsync()`, then `localUri ?? uri`).

## pdf-lib (and other CJS libs that `require("tslib")`) crash under Hermes via Metro package-exports
pdf-lib's CJS does `require("tslib")`. Metro's package-exports resolution maps the bare `tslib`
specifier to tslib's ESM build, and the default-import interop fails at runtime with
`TypeError: Cannot destructure property '__extends' of 'tslib.default' as it is undefined`
(blank screen / red error on the editor route). tslib's `exports` map exposes the CJS entry via
the `"./"` subpath, so force the bare specifier to it in `metro.config.js`:
```js
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === "tslib"
    ? context.resolveRequest(context, "tslib/tslib.js", platform)
    : context.resolveRequest(context, moduleName, platform);
```
**Why:** took several attempts — the crash looks like an app bug but is a bundler resolution issue.
**How to apply:** any pure-JS CJS dep that `require("tslib")` (pdf-lib, many TS-compiled libs) can
hit this. After editing metro.config.js, restart the Expo workflow (and clear Metro cache if the old
error persists — see top of this file).

## Package installs can crash an already-running Metro watcher

If Metro fails while watching a pnpm temporary package directory that no longer exists, finish the package installation before restarting Metro.

**Why:** pnpm creates and renames temporary directories while Metro crawls the workspace. Its fallback watcher can race those renames and exit even when the final package installation is correct.

**How to apply:** treat an install-time watch ENOENT on a temporary package directory as a watcher lifecycle issue, not a missing app dependency. Restart once after the install completes; do not add the vanished temporary directory or change app imports.
