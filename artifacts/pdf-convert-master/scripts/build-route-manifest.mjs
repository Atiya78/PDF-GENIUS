import fs from "node:fs/promises";
import { toolPages, legacyToolRedirects } from "../src/config/toolPages.ts";
import { publicPages } from "../src/config/publicPages.ts";
const source = await fs.readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const routes = [...source.matchAll(/<Route\s+path=["']([^"']+)["']/g)]
  .map((match) => match[1]).filter(route => route !== "/:toolSlug");
await fs.writeFile(new URL("../dist/public/route-manifest.json", import.meta.url), JSON.stringify({
  routes: [...new Set([...routes, ...publicPages.map(page => page.path), ...toolPages.map(page => `/${page.slug}`)])],
  redirects: legacyToolRedirects,
}, null, 2));