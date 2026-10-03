import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import { toolPages } from "../src/config/toolPages.ts";
import { publicPages } from "../src/config/publicPages.ts";
import { createPrerenderServer } from "./prerender-server.mjs";

const artifact = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(artifact, "dist/public");
const siteOrigin = "https://pdfgenius.app"; // Owner-provided canonical production site.
const routes = [...new Set([...publicPages.map(page => page.path), ...toolPages.map(page => `/${page.slug}`)])];
const originalHtml = await fsp.readFile(path.join(output, "index.html"), "utf8");
const privateHtml = originalHtml.replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
  .replace("</head>", '<meta name="robots" content="noindex,nofollow"></head>');
await fsp.writeFile(path.join(output, "private-shell.html"), privateHtml);

async function executable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  for (const name of ["chromium", "chromium-browser", "google-chrome"]) {
    try { return execFileSync("which", [name], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
  }
  let bundled;
  try { bundled = await puppeteer.executablePath(); } catch {}
  if (bundled && fs.existsSync(bundled)) return bundled;
  // Railway has no system Chromium. Use the existing repo-local cache config,
  // and fail the build rather than publish an empty, unprerendered shell.
  execFileSync("pnpm", ["exec", "puppeteer", "browsers", "install", "chrome"], { cwd: artifact, stdio: "inherit" });
  return await puppeteer.executablePath();
}

const apiOrigin = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : siteOrigin;
const server = createPrerenderServer(output, apiOrigin);
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const snapshots = new Map();
try {
  browser = await puppeteer.launch({ executablePath: await executable(), headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { window.__PDF_GENIUS_PRERENDER__ = true; });
  page.on("pageerror", error => console.error(`Prerender browser error: ${error.message}`));
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  page.on("request", request => {
    const url = request.url();
    // Never contact Ads/chat/trackers or remote images from the build browser.
    if (url.startsWith(origin) || /^(data|blob):/.test(url)) request.continue();
    else request.abort();
  });
  for (const route of [...routes, "/404"]) {
    await page.goto(`${origin}${route}`, { waitUntil: "networkidle2", timeout: 45000 });
    await page.waitForFunction(expected =>
      document.querySelector("#root h1") &&
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") === expected,
    { timeout: 20000 }, `${siteOrigin}${route === "/" ? "/" : route}`).catch(async error => {
      const state = await page.evaluate(() => ({
        title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
        h1: document.querySelectorAll("#root h1").length,
        preview: document.querySelector("#root")?.textContent?.slice(0, 200),
      }));
      throw new Error(`Prerender not ready ${route}: ${JSON.stringify(state)} (${error.message})`);
    });
    // Trigger viewport reveals so captured below-fold sections aren't invisible.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 800) {
      await page.evaluate(top => window.scrollTo(0, top), y);
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    await new Promise(resolve => setTimeout(resolve, 400));
    await page.evaluate(() => window.scrollTo(0, 0));
    const check = await page.evaluate(() => ({
      headings: document.querySelectorAll("#root h1").length,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content"),
      text: document.querySelector("#root")?.textContent?.trim().length || 0,
      noindex: document.querySelector('meta[name="robots"]')?.getAttribute("content")?.includes("noindex"),
      schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => {
        const data = JSON.parse(node.textContent || "{}");
        return JSON.stringify(data).match(/AggregateRating|Review/g) || [];
      }),
    }));
    if (check.headings !== 1 || check.text < 100 || (route !== "/404" && check.noindex) || check.schemas.length) throw new Error(`Invalid prerender ${route}: ${JSON.stringify(check)}`);
    if (toolPages.some(tool => `/${tool.slug}` === route) && (!check.description || check.description.length >= 155 || check.title.length >= 60)) throw new Error(`Tool metadata exceeds limits: ${route}`);
    snapshots.set(route, await page.content());
    console.log(`Prerendered ${route}: one H1, ${check.text} text characters`);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
// Capture every route from the same original shell before overwriting home.
for (const [route, html] of snapshots) {
  if (route === "/404") {
    await fsp.writeFile(path.join(output, "404.html"), html);
    continue;
  }
  const destination = route === "/" ? output : path.join(output, route.slice(1));
  await fsp.mkdir(destination, { recursive: true });
  await fsp.writeFile(path.join(destination, "index.html"), html);
}
const metadataFiles = ["toolPages.ts", "publicPages.ts", "homeFaq.ts"].map(file => path.join(artifact, "src/config", file));
const lastmod = new Date(Math.max(...await Promise.all(metadataFiles.map(async file => (await fsp.stat(file)).mtimeMs)))).toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `  <url><loc>${siteOrigin}${route}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`;
for (const directory of [output, path.join(artifact, "public")]) await fsp.writeFile(path.join(directory, "sitemap.xml"), sitemap);
console.log(`Prerender complete: ${routes.length} public pages. Private routes excluded.`);