import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };

/** Build-only server. Proxy public GETs, never submit mutations during capture. */
export function createPrerenderServer(root, apiOrigin) {
  const cache = new Map();
  return http.createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname.startsWith("/api/")) {
      if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
      try {
        if (!cache.has(req.url)) {
          const response = await fetch(new URL(req.url, apiOrigin), { signal: AbortSignal.timeout(8000) });
          cache.set(req.url, { status: response.status, type: response.headers.get("content-type") || "application/json", body: Buffer.from(await response.arrayBuffer()) });
        }
        const data = cache.get(req.url);
        res.writeHead(data.status, { "Content-Type": data.type });
        res.end(data.body);
      } catch {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Public API unavailable during prerender" }));
      }
      return;
    }
    let file = path.resolve(root, `.${decodeURIComponent(pathname)}`);
    if (!file.startsWith(`${root}/`) && file !== root) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
    res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
}