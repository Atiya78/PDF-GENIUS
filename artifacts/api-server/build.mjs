import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "heic-convert",
      // Official SDK reads its own package.json and helper modules at runtime.
      "replicate",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
      "pdfjs-dist",
      "pdfjs-dist/*",
      "pdf-parse",
      "tesseract.js",
      "@napi-rs/canvas",
      // These resolve a bundled binary path relative to their own module
      // location, so they must stay external (bundling breaks the path).
      "ffmpeg-static",
      "ffprobe-static",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

// Ensure a Chrome binary exists for Puppeteer when the machine has no system
// Chromium (e.g. the Railway production image — dev on Replit uses the Nix
// chromium found via `which`). Puppeteer's install-time download can be
// skipped by pnpm's side-effects cache and its default cache dir doesn't
// survive into Railway's runtime image, so we install into the repo-local
// cache (.puppeteerrc.cjs → <repo>/.puppeteer-cache) during the build.
async function ensurePuppeteerChrome() {
  const { execSync } = await import("node:child_process");
  const { existsSync } = await import("node:fs");
  try {
    execSync("which chromium || which chromium-browser", { stdio: "ignore" });
    return; // system Chromium available (dev) — no download needed
  } catch {
    // no system browser — fall through to Puppeteer's bundled Chrome
  }
  try {
    const puppeteer = (await import("puppeteer")).default;
    // executablePath() is async in this Puppeteer version; it resolves to the
    // repo-local cache path (.puppeteerrc.cjs) whether or not it's installed.
    const p = await puppeteer.executablePath();
    if (p && existsSync(p)) return; // already installed
  } catch {
    // executablePath throws when not installed — install below
  }
  console.log("No Chromium found — installing Puppeteer Chrome into repo-local cache...");
  execSync("pnpm exec puppeteer browsers install chrome", {
    stdio: "inherit",
    cwd: artifactDir,
  });
}

buildAll()
  .then(ensurePuppeteerChrome)
  .catch((err) => {
  console.error(err);
  process.exit(1);
});
