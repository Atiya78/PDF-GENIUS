import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist/public");
// Reuse the project's existing Puppeteer/Chrome installation (also used by
// HTML/Word conversion); no second browser dependency or SSR framework.
const apiDir = path.resolve(root, "../api-server");
const require = createRequire(path.join(apiDir, "package.json"));
const puppeteer = require("puppeteer");
const tools = JSON.parse(await readFile(path.join(root, "src/config/toolLandingData.json"), "utf8"));
const publicPages = JSON.parse(await readFile(path.join(root, "src/config/publicPageSeo.json"), "utf8"));
const publicPaths = [...publicPages.map(p => p.path), ...tools.map(p => p.path)];
const appSource = await readFile(path.join(root, "src/App.tsx"), "utf8");
const knownPaths = [...new Set([...publicPaths, ...[...appSource.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1])])];
const redirects = Object.fromEntries(tools.map(p => [`/upload/${p.id}`, p.path]));
redirects["/upload/restore-document"] = "/restore-document";
const shell = await readFile(path.join(dist, existsSync(path.join(dist, "spa.html")) ? "spa.html" : "index.html"), "utf8");
await writeFile(path.join(dist, "spa.html"), shell);

const types = { ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".woff2":"font/woff2", ".wasm":"application/wasm" };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const target = path.resolve(dist, relative);
    if (target.startsWith(dist + path.sep) && /\.[a-z0-9]+$/i.test(target) && existsSync(target)) {
      res.setHeader("Content-Type", types[path.extname(target)] ?? "application/octet-stream");
      return res.end(await readFile(target));
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!publicPaths.includes(url.pathname)) res.statusCode = 404;
    res.end(shell);
  } catch (error) { res.statusCode = 500; res.end(String(error)); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  let executablePath;
  for (const command of ["chromium", "chromium-browser"]) {
    try { executablePath = execFileSync("which", [command], { encoding:"utf8" }).trim(); break; } catch {}
  }
  if (!executablePath) {
    try { executablePath = await puppeteer.executablePath(); } catch {}
    if (!executablePath || !existsSync(executablePath)) {
      execFileSync("pnpm", ["exec", "puppeteer", "browsers", "install", "chrome"], { cwd:apiDir, stdio:"inherit" });
      executablePath = await puppeteer.executablePath();
    }
  }
  browser = await puppeteer.launch({ executablePath, headless:true, args:["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  await page.setViewport({ width:1440, height:1000 });
  await page.setRequestInterception(true);
  page.on("request", request => {
    // Never run Ads, uploads, account calls or external tracking at build time.
    const url = request.url();
    if ((url.startsWith(origin + "/") && !url.startsWith(origin + "/api/")) || url.startsWith("data:") || url.startsWith("blob:")) request.continue();
    else request.abort();
  });
  let pageErrors = [];
  page.on("pageerror", error => pageErrors.push(String(error)));
  for (const route of [...publicPaths, "/404"]) {
    pageErrors = [];
    await page.goto(origin + route, { waitUntil:"networkidle0", timeout:45000 });
    await page.waitForFunction(route => document.documentElement.dataset.seoPath === route && (document.querySelector("#root main")?.textContent.length ?? 0) > 100, { timeout:15000 }, route);
    if (pageErrors.length) throw new Error(`${route}: ${pageErrors.join("; ")}`);
    const metadata = await page.evaluate(() => ({
      title:document.title,
      description:document.querySelector('meta[name="description"]')?.content,
      canonical:document.querySelector('link[rel="canonical"]')?.href,
      h1:document.querySelectorAll("#root h1").length,
      text:document.querySelector("#root")?.textContent,
      schemas:[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(s => {
        const value = JSON.parse(s.textContent); return Array.isArray(value) ? value : [value];
      }),
    }));
    if (!metadata.description || metadata.canonical !== `https://pdfgenius.app${route}` || metadata.text.length < 150) throw new Error(`Incomplete render: ${route}`);
    const tool = tools.find(t => t.path === route);
    if (tool) {
      if (metadata.h1 !== 1 || metadata.title.length >= 60 || metadata.description.length >= 155) throw new Error(`Tool SEO constraint failed: ${route}`);
      for (const type of ["FAQPage", "HowTo", "BreadcrumbList"]) {
        if (!metadata.schemas.some(s => s["@type"] === type)) throw new Error(`Missing ${type}: ${route}`);
      }
      const faq = metadata.schemas.find(s => s["@type"] === "FAQPage");
      if (faq.mainEntity.length !== 4) throw new Error(`Expected four FAQs: ${route}`);
    }
    if (route === "/" && !["Organization", "WebApplication"].every(t => metadata.schemas.some(s => s["@type"] === t))) throw new Error("Homepage schema missing");
    const hasForbiddenType = value => value && typeof value === "object" && (
      [value["@type"]].flat().some(type => type === "AggregateRating" || type === "Review")
      || Object.values(value).some(hasForbiddenType)
    );
    if (metadata.schemas.some(hasForbiddenType)) throw new Error(`Forbidden rating/review schema: ${route}`);
    const html = await page.content();
    const destination = route === "/" ? path.join(dist, "index.html") : route === "/404" ? path.join(dist, "404.html") : path.join(dist, route.slice(1), "index.html");
    await mkdir(path.dirname(destination), { recursive:true });
    await writeFile(destination, html);
    console.log(`Pre-rendered ${route}`);
  }
  // Source modification date, not an arbitrary historical date or build time.
  async function latestModification(dir) {
    let latest = 0;
    for (const entry of await readdir(dir, { withFileTypes:true })) {
      const p = path.join(dir, entry.name);
      latest = Math.max(latest, entry.isDirectory() ? await latestModification(p) : (await stat(p)).mtimeMs);
    }
    return latest;
  }
  const lastmod = new Date(Math.max(await latestModification(path.join(root, "src")), (await stat(path.join(root, "index.html"))).mtimeMs)).toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPaths.map(p => `  <url><loc>https://pdfgenius.app${p}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`;
  await writeFile(path.join(dist, "sitemap.xml"), xml);
  await writeFile(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: https://pdfgenius.app/sitemap.xml\n");
  await writeFile(path.join(dist, "routes-manifest.json"), JSON.stringify({ publicPaths, knownPaths, redirects }, null, 2));
  console.log(`SEO build complete: ${publicPaths.length} public pages + 404; sitemap lastmod ${lastmod}.`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}