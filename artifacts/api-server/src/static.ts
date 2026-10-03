import express, { type Express } from "express";
import path from "path";
import fs from "fs";
import { logger } from "./lib/logger";

/**
 * Serve the built web frontend (pdf-convert-master) from the API server so the
 * whole app lives on a single origin. The web app calls the API with
 * same-origin `/api/...` paths, so co-hosting avoids CORS and cross-domain
 * configuration entirely.
 *
 * This is intentionally a no-op when the web build is absent (e.g. local Replit
 * dev, where the web app runs as its own artifact behind the shared proxy).
 */
export function serveWebApp(app: Express): void {
  // At runtime this file is bundled to artifacts/api-server/dist/index.mjs, so
  // __dirname is .../artifacts/api-server/dist. The web build lives alongside
  // it in the sibling artifact.
  const clientDir = path.resolve(
    __dirname,
    "../../pdf-convert-master/dist/public",
  );
  const indexHtml = path.join(clientDir, "index.html");

  if (!fs.existsSync(indexHtml)) {
    logger.warn(
      { clientDir },
      "Web build not found; skipping static file serving (API-only mode)",
    );
    return;
  }

  // Serve hashed assets and other static files.
  app.use(express.static(clientDir));

  // SPA fallback: any non-API GET request returns index.html so client-side
  // routing works on deep links / refreshes. The negative lookahead keeps the
  // API namespace untouched.
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    res.sendFile(indexHtml);
  });

  logger.info({ clientDir }, "Serving web app from API server");
}
