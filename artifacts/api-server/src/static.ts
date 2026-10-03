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

  // A missing SEO manifest is a broken deployment, not permission to serve the
  // homepage with 200 for arbitrary URLs.
  const manifest = JSON.parse(fs.readFileSync(path.join(clientDir, "routes-manifest.json"), "utf8")) as {
    publicPaths: string[];
    knownPaths: string[];
    redirects: Record<string, string>;
  };
  const publicPaths = new Set(manifest.publicPaths);
  const knownPaths = new Set(manifest.knownPaths);
  const shellHtml = fs.readFileSync(path.join(clientDir, "spa.html"), "utf8");

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const normalized = req.path.replace(/\/+$/, "") || "/";
    const target = manifest.redirects[normalized];
    if (target) return res.redirect(301, target + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""));
    if (normalized !== req.path && publicPaths.has(normalized)) {
      return res.redirect(301, normalized + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""));
    }
    next();
  });
  // Never expose generated route HTML under duplicate /tool/index.html URLs.
  app.use((req, res, next) => {
    if (req.path.endsWith("/index.html")) {
      const canonical = req.path.slice(0, -11) || "/";
      if (publicPaths.has(canonical)) return res.redirect(301, canonical);
    }
    if (["/spa.html", "/404.html", "/routes-manifest.json", "/index.html"].includes(req.path)) return next();
    if (req.path.startsWith("/assets/")) {
      return express.static(clientDir, { immutable:true, maxAge:"1y", redirect:false, index:false })(req, res, next);
    }
    express.static(clientDir, { redirect:false, index:false })(req, res, next);
  });

  app.get(/^(?!\/api(?:\/|$)).*/, (req, res, next) => {
    const route = req.path;
    if (route === "/index.html") return res.redirect(301, "/");
    if (publicPaths.has(route)) {
      return res.sendFile(route === "/" ? indexHtml : path.join(clientDir, route.slice(1), "index.html"));
    }
    if (knownPaths.has(route) && !route.startsWith("/upload/")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      // Private pages get the pristine shell (never a cached user's markup).
      const title = `${route.slice(1).split(/[/-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")} | PDF Genius`;
      const canonical = `https://pdfgenius.app${route}`;
      const description = "Access your PDF Genius account or tool workspace. Sign in where required to use account features.";
      const head = `<title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}">`;
      const privateHtml = shellHtml
        .replace(/<title>[\s\S]*?<\/title>/i, "")
        .replace(/<meta\b[^>]*(?:name=["'](?:description|robots|twitter:(?:title|description|card))["']|property=["']og:(?:title|description|url|type)["'])[^>]*>/gi, "")
        .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "")
        .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "")
        .replace("</head>", `${head}</head>`);
      return res.type("html").send(privateHtml);
    }
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.status(404).sendFile(path.join(clientDir, "404.html"));
  });

  logger.info({ clientDir }, "Serving web app from API server");
}
