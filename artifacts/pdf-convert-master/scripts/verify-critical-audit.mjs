// Read-only browser checks for the audit. No uploads, real purchases or account mutations.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.resolve(root, "../api-server/package.json"));
const puppeteer = require("puppeteer");
const origin = process.env.AUDIT_BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const livePlans = await fetch(origin + "/api/plans").then(response => response.json());
const executablePath = process.env.CHROMIUM_PATH ||
  (() => { try { return execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(); } catch { return null; } })() ||
  await puppeteer.executablePath();
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const widths = [320, 360, 375, 414, 768, 800, 900, 1024, 1100, 1280, 1366, 1440, 1536, 1600, 1920, 2560];
const failures = [];
let signedInFixture = false;
let checks = 0;
const verify = (condition, message) => { checks++; if (!condition) failures.push(message); };
const page = await browser.newPage();
page.on("pageerror", error => failures.push(`Browser error: ${error.message}`));
page.on("console", message => {
  if (message.type() === "error" && signedInFixture) console.error("Account-layout console:", message.text());
});
await page.setRequestInterception(true);
page.on("request", request => {
  const url = request.url();
  const pathname = new URL(url).pathname;
  if (signedInFixture && pathname === "/api/plans") {
    return request.respond({ status: 200, contentType: "application/json", body: JSON.stringify(livePlans) });
  }
  if (signedInFixture && pathname === "/api/user") {
    return request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({
      success: true, data: { user: { id: 777, email: "audit@example.invalid", name: "Audit Fixture", plan: "pro", credits: 0, dodoSubscriptionId: "audit-subscription-fixture" } },
    }) });
  }
  if (signedInFixture && pathname === "/api/usage") {
    return request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({
      success: true, data: { totals: { total: 2, completed: 2, failed: 0, apiCalls: 2, webCalls: 0, successRate: 100, dataProcessed: 100, activeKeys: 0 } },
    }) });
  }
  const allowed = ["GET", "HEAD"].includes(request.method()) &&
    (url.startsWith(origin) || /https:\/\/fonts\.(googleapis|gstatic)\.com/.test(url) || /^(data|blob):/.test(url));
  allowed ? request.continue() : request.abort();
});
async function visit(route) {
  await page.goto(origin + route, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { timeout: 20000 });
  if (route === "/pricing") await page.waitForSelector('[data-testid="button-plan-pro"]');
  if (route === "/docs") await page.waitForSelector('[data-testid="endpoint-pdf_to_word"]');
  await page.evaluate(() => document.fonts.ready);
}
try {
  for (const route of (process.env.AUDIT_INTERACTIONS_ONLY || process.env.AUDIT_ACCOUNT_ONLY ? [] : ["/pricing", "/about", "/", "/docs"])) {
    await page.setViewport({ width: 360, height: 950 });
    await visit(route);
    for (const width of widths) {
      await page.setViewport({ width, height: 950 });
      await new Promise(resolve => setTimeout(resolve, 80));
      const state = await page.evaluate(() => {
        const visible = element => !!element && element.getBoundingClientRect().width > 0;
        const nav = document.querySelector('[data-testid="nav-home"]');
        const menu = document.querySelector('[data-testid="button-mobile-menu"]');
        const search = document.querySelector('[data-testid="button-tool-search"]') || document.querySelector('[data-testid="input-tool-search"]');
        const brand = document.querySelector('a[aria-label="PDF Genius home"]');
        const h1 = document.querySelector("h1");
        const hero = h1.closest("section");
        const contact = hero?.querySelector("div.flex.flex-wrap");
        const copy = document.querySelector('[data-testid="button-copy-curl"]');
        return {
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          todos: /\bTODO\s*:/.test(document.body.innerText),
          nav: visible(nav), menu: visible(menu), search: visible(search),
          brand: brand?.getAttribute("href"),
          gap: visible(nav) && brand ? nav.getBoundingClientRect().left - brand.getBoundingClientRect().right : null,
          headingInHero: !hero || h1.getBoundingClientRect().top >= hero.getBoundingClientRect().top,
          contactInHero: !contact || contact.getBoundingClientRect().bottom <= hero.getBoundingClientRect().bottom,
          copyClear: !copy || copy.getBoundingClientRect().bottom <= copy.closest('[class*="p-4"]').querySelector("pre").getBoundingClientRect().top,
          planButtonsFit: [...document.querySelectorAll('[data-testid^="button-plan-"]')].every(el => el.scrollWidth <= el.clientWidth + 1),
          viewport: document.querySelector('meta[name="viewport"]').content,
        };
      });
      const context = `${route} @ ${width}px`;
      verify(!state.overflow, `${context}: horizontal page overflow`);
      verify(!state.todos, `${context}: visible TODO`);
      verify(state.brand === "/", `${context}: real home link missing`);
      verify(state.search, `${context}: search not visible`);
      verify(width < 1024 ? state.menu && !state.nav : state.nav && !state.menu, `${context}: wrong navigation breakpoint`);
      verify(state.gap === null || state.gap >= 12, `${context}: brand/navigation gap too small`);
      verify(state.headingInHero && state.contactInHero, `${context}: About hero clips content`);
      verify(state.copyClear, `${context}: Copy overlaps code`);
      verify(state.planButtonsFit, `${context}: pricing button content overflows`);
      verify(!/maximum-scale|user-scalable/.test(state.viewport), `${context}: zoom restricted`);
    }
    console.log(`Responsive matrix completed for ${route}; ${failures.length} failures so far.`);
  }
  if (!process.env.AUDIT_ACCOUNT_ONLY) {
  await page.setViewport({ width: 360, height: 950 });
  await visit("/");
  await page.click('[data-testid="button-mobile-menu"]');
  await page.waitForSelector('[data-testid="mobile-nav-home"]', { visible: true });
  verify(await page.$eval('[data-testid="mobile-nav-home"]', el => el.tagName === "A"), "Mobile Home is not a link");
  verify(await page.$eval('[data-testid="mobile-nav-education-zone"]', el => el.tagName === "A"), "Mobile Education is not a link");
  await page.click('[data-testid="mobile-nav-education-zone"]');
  await page.waitForFunction(() => location.pathname === "/education");
  await page.waitForFunction(() => !document.querySelector('[data-testid="mobile-nav-home"]'));
  verify(true, "Mobile navigation dismisses drawer");
  await page.click('[data-testid="button-tool-search"]');
  await page.waitForSelector('[data-testid="input-tool-search"]', { visible: true });
  await page.type('[data-testid="input-tool-search"]', "PDF to Word");
  await page.waitForFunction(() => document.querySelector('[data-testid="search-tool-pdf-to-word"]')?.getAttribute("aria-selected") === "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.pathname === "/pdf-to-word");
  await page.waitForFunction(() => !document.querySelector('[data-testid="input-tool-search"]'));
  verify(!await page.$('[data-testid="input-tool-search"]'), "Search popup did not close after selecting result");
  await visit("/");
  await page.evaluate(() => {
    window.__auditClipboard = "";
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__auditClipboard = text; } } });
  });
  await page.$eval('[data-testid="button-copy-curl"]', el => el.focus());
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__auditClipboard.includes("curl -X POST"));
  verify(await page.$eval('[data-testid="button-copy-curl"]', el => el.innerText.includes("Copied!")), "Copy feedback missing");
  await page.evaluate(() => [...document.querySelectorAll("button")].find(el => el.textContent.includes("View Documentation")).click());
  await page.waitForFunction(() => location.pathname === "/docs");
  await page.waitForSelector('[data-testid="endpoint-pdf_to_word"]');
  verify(true, "Home documentation CTA opens public reference");
  await page.evaluate(() => [...document.querySelectorAll("button")].find(el => el.textContent === "Get API Key").click());
  await page.waitForFunction(() => location.pathname === "/signin");
  verify(true, "API key creation remains protected");
  for (const route of ["/education", "/pdf-to-word", "/merge-pdf", "/edit-pdf", "/nonexistent-audit-route"]) {
    await visit(route);
    verify(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), `${route}: mobile page overflow`);
  }
  }
  signedInFixture = true;
  await page.evaluateOnNewDocument(() => localStorage.setItem("auth_token", "audit-fixture-not-a-real-token"));
  await page.setViewport({ width: 360, height: 950 });
  await visit("/dashboard/manage-plans");
  await page.waitForSelector('[data-testid="button-manage-billing"]', { timeout: 6000 });
  verify(await page.$eval('[data-testid="button-plan-pro"]', el => el.disabled && el.textContent.includes("Current Plan")), "Signed-in current plan not disabled");
  verify(await page.$eval('[data-testid="button-plan-business"]', el => el.textContent.includes("Switch Plan")), "Signed-in subscriber switch label changed");
  await page.click('[data-testid="toggle-billing-year"]');
  verify(await page.$eval('[data-testid="toggle-billing-year"]', el => el.getAttribute("aria-selected") === "true"), "Yearly toggle not selected");
  for (const width of widths) {
    await page.setViewport({ width, height: 950 });
    await new Promise(resolve => setTimeout(resolve, 80));
    const state = await page.evaluate(() => {
      const visible = el => !!el && el.getBoundingClientRect().width > 0;
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        search: visible(document.querySelector('[data-testid="button-tool-search"]')),
        desktop: visible(document.querySelector('[data-testid="nav-home"]')),
        mobile: visible(document.querySelector('[data-testid="button-mobile-menu"]')),
        buttons: [...document.querySelectorAll('[data-testid^="button-plan-"]')].every(el => el.scrollWidth <= el.clientWidth + 1),
      };
    });
    verify(!state.overflow && state.buttons, `Signed-in plans @ ${width}px: layout overflow`);
    verify(state.search, `Signed-in plans @ ${width}px: search hidden`);
    verify(width < 1024 ? state.mobile && !state.desktop : state.desktop && !state.mobile, `Signed-in plans @ ${width}px: navigation breakpoint`);
  }
  console.log(`${checks} assertions completed; clipboard and signed-in account/usage use isolated fixtures. Public catalog requests use the running API; no real payment actions are taken.`);
  assert.deepEqual(failures, [], failures.join("\n"));
} catch (error) {
  console.error("Current page:", page.url(), await page.evaluate(() => document.body.innerText.slice(0, 2200)));
  console.error("Recorded failures:", failures);
  throw error;
} finally {
  await browser.close();
}