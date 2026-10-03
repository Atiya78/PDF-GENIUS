import express, { type Express } from "express";
import path from "path";
import fs from "fs";
import compression from "compression";
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
  const routeManifest = path.join(clientDir, "route-manifest.json");
  const manifest: { routes: string[]; redirects?: Record<string, string> } = fs.existsSync(routeManifest)
    ? JSON.parse(fs.readFileSync(routeManifest, "utf8"))
    : { routes: ["/"] };
  const routes = manifest.routes;
  const redirects = manifest.redirects ?? {};

  if (!fs.existsSync(indexHtml)) {
    logger.warn(
      { clientDir },
      "Web build not found; skipping static file serving (API-only mode)",
    );
    return;
  }

  // Real redirects on production requests; client navigation also replaces URLs.
  app.use(compression({ threshold: 1024 }));
  app.use((req, res, next) => {
    const requestPath = req.path.replace(/\/+$/, "") || "/";
    const destination = redirects[requestPath];
    if (destination && (req.method === "GET" || req.method === "HEAD")) {
      const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
      res.redirect(301, destination + query);
      return;
    }
    next();
  });
  // Avoid Express's directory -> trailing-slash redirect for prerendered routes.
  app.use(express.static(clientDir, {
    index: false,
    redirect: false,
    setHeaders(res, file) {
      if (file.includes(`${path.sep}assets${path.sep}`) && /-[A-Za-z0-9_-]{8,}\.[^.]+$/.test(file)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (file.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  // SPA fallback: any non-API GET request returns index.html so client-side
  // routing works on deep links / refreshes. The negative lookahead keeps the
  // API namespace untouched.
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    const requestPath = req.path.replace(/\/+$/, "") || "/";
    res.setHeader("Cache-Control", "no-cache");
    const knownRoute = routes.some((route) => {
      const pattern = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:[A-Za-z]+/g, "[^/]+");
      return new RegExp(`^${pattern}$`).test(requestPath);
    });
    if (!knownRoute) {
      res.status(404);
      res.setHeader("X-Robots-Tag", "noindex");
    }
    const privateRoute = /^\/(?:dashboard|account)(?:\/|$)/.test(requestPath)
      || ["/signin", "/signup", "/login", "/forgot-password", "/reset-password", "/admin"].includes(requestPath);
    if (privateRoute) res.setHeader("X-Robots-Tag", "noindex,nofollow");
    const pageHtml = path.join(clientDir, requestPath.slice(1), "index.html");
    const privateHtml = path.join(clientDir, "private-shell.html");
    const missingHtml = path.join(clientDir, "404.html");
    res.sendFile(!knownRoute && fs.existsSync(missingHtml)
      ? missingHtml
      : privateRoute && fs.existsSync(privateHtml)
      ? privateHtml
      : knownRoute && fs.existsSync(pageHtml) ? pageHtml : indexHtml);
  });

  logger.info({ clientDir }, "Serving web app from API server");
}
