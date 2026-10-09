import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createReplicateClient, replicateOutputUrl, validateReplicateImageUrl } from "../src/lib/replicateImage";

const account = { type: "user", username: "unit-test", name: "Unit test" };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json" },
});

function fixtureEnvironment(t: TestContext, replit: boolean) {
  const keys = ["REPLICATE_API_TOKEN", "REPL_IDENTITY", "WEB_REPL_RENEWAL"] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.REPLICATE_API_TOKEN = "unit-test-only-not-a-real-token";
  delete process.env.WEB_REPL_RENEWAL;
  if (replit) process.env.REPL_IDENTITY = "unit-test-only";
  else delete process.env.REPL_IDENTITY;
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

test("FileOutput objects, arrays and legacy URLs resolve to allowed file hosts", () => {
  const url = new URL("https://replicate.delivery/test/result.webp");
  assert.equal(replicateOutputUrl({ url: () => url }).href, url.href);
  assert.equal(replicateOutputUrl([{ url: () => url }]).href, url.href);
  assert.equal(replicateOutputUrl(url.href).href, url.href);
  assert.equal(validateReplicateImageUrl("https://api.replicate.com/v1/files/test").hostname, "api.replicate.com");
  for (const value of ["http://replicate.delivery/a", "https://replicate.delivery.evil.test/a", "https://localhost/a", "https://user:password@replicate.delivery/a", "https://api.replicate.com:8080/a"])
    assert.throws(() => validateReplicateImageUrl(value));
  assert.throws(() => replicateOutputUrl([]));
});

test("official SDK authenticates directly without Replit identity (Railway path)", async t => {
  fixtureEnvironment(t, false);
  let direct = 0;
  t.mock.method(globalThis, "fetch", async () => { direct++; return json(account); });
  assert.equal((await createReplicateClient().accounts.current()).username, "unit-test");
  assert.equal(direct, 1);
});

test("explicit 401 falls back once to attached connection without forwarding a rejected key", async t => {
  fixtureEnvironment(t, true);
  let direct = 0, attached = 0;
  t.mock.method(globalThis, "fetch", async () => { direct++; return json({ detail: "Unauthorized" }, 401); });
  t.mock.method(ReplitConnectors.prototype, "proxy", async (_name: string, path: string, options: { headers: Record<string, string> }) => {
    attached++;
    assert.equal(path, "/v1/account");
    assert.ok(!Object.keys(options.headers).some(key => key.toLowerCase() === "authorization"));
    return json(account);
  });
  await createReplicateClient().accounts.current();
  assert.equal(direct, 1);
  assert.equal(attached, 1);
});

test("Railway authentication rejection cannot invoke a Replit connector", async t => {
  fixtureEnvironment(t, false);
  t.mock.method(globalThis, "fetch", async () => json({}, 401));
  const proxy = t.mock.method(ReplitConnectors.prototype, "proxy", async () => json(account));
  await assert.rejects(createReplicateClient().accounts.current(), (error: any) => error.response.status === 401);
  assert.equal(proxy.mock.callCount(), 0);
});

test("billing, permission and server failures do not create a second prediction through another credential", async t => {
  fixtureEnvironment(t, true);
  const proxy = t.mock.method(ReplitConnectors.prototype, "proxy", async () => json(account));
  for (const status of [402, 403, 500]) {
    const fetch = t.mock.method(globalThis, "fetch", async () => json({}, status));
    await assert.rejects(createReplicateClient().predictions.create({
      version: "5c137257cce8d5ce16e8a334b70e9e025106b5580affed0bc7d48940b594e74c",
      input: { image: "data:image/png;base64,dGVzdA==" },
    }), (error: any) => error.response.status === status);
    assert.equal(fetch.mock.callCount(), 1);
    fetch.mock.restore();
  }
  assert.equal(proxy.mock.callCount(), 0);
});
