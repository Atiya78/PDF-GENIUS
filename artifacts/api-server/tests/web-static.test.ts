import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { serveWebApp } from "../src/static";

test("production SEO HTTP contract preserves tools, API and private pages", async () => {
  const client = path.resolve(import.meta.dirname, "../../pdf-convert-master/dist/public");
  const manifest = JSON.parse(fs.readFileSync(path.join(client, "routes-manifest.json"), "utf8"));
  Object.assign(globalThis, { __dirname: path.resolve(import.meta.dirname, "../dist") });
  const app = express();
  app.get("/api/seo-test", (_req, res) => res.json({ ok: true }));
  serveWebApp(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    for (const route of manifest.publicPaths) {
      const response = await fetch(origin + route, { redirect: "manual" });
      assert.equal(response.status, 200, route);
      const html = await response.text();
      assert(html.includes(`href="https://pdfgenius.app${route}"`), `canonical ${route}`);
      assert(html.includes('property="og:title"'), `OG ${route}`);
      assert(html.includes('name="twitter:title"'), `Twitter ${route}`);
      assert(html.includes('name="description"'), `description ${route}`);
      assert(html.includes("<main"), `pre-rendered body ${route}`);
      assert(!html.includes("Trusted by 10M+"), `unsupported claim ${route}`);
    }
    for (const [oldPath, target] of Object.entries(manifest.redirects)) {
      const response = await fetch(origin + oldPath + "?source=old", { redirect: "manual" });
      assert.equal(response.status, 301, oldPath);
      assert.equal(response.headers.get("location"), target + "?source=old");
    }
    for (const route of ["/made-up-tool", "/unknown.html", "/dashboard/not-a-page", "/spa.html", "/routes-manifest.json"]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 404, route);
      assert.match(await response.text(), /Page not found/);
    }
    for (const route of ["/signin", "/signup", "/dashboard", "/dashboard/profile", "/admin"]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
      const html = await response.text();
      assert.match(html, /name="robots" content="noindex,nofollow"/);
      assert(html.includes(`href="https://pdfgenius.app${route}"`));
      assert(!html.includes("<main"), "private pages must use a fresh shell, not cached account HTML");
    }
    const head = await fetch(origin + "/not-a-route", { method: "HEAD" });
    assert.equal(head.status, 404);
    const api = await fetch(origin + "/api/seo-test");
    assert.deepEqual(await api.json(), { ok: true });
    assert.equal((await fetch(origin + "/pdf-to-word/", { redirect: "manual" })).status, 301);
    assert.equal((await fetch(origin + "/pdf-to-word/index.html", { redirect: "manual" })).status, 301);
    const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
    assert.equal((sitemap.match(/<loc>/g) ?? []).length, manifest.publicPaths.length);
    assert(!sitemap.includes("/upload/") && !sitemap.includes("/dashboard") && !sitemap.includes("/signin"));
    console.log(`Verified ${manifest.publicPaths.length} pre-rendered public routes and ${Object.keys(manifest.redirects).length} permanent redirects.`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});