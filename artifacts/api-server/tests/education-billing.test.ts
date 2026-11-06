import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { pool } from "@workspace/db";
import { addMonths, catalog, plans, usagePrice } from "../src/education/billing/catalog";
import { activeTier, refreshMonthlyGrants, settleEducationCharge, reservePaidUsage } from "../src/education/billing/store";
import { fulfillTransaction, verifyPaddleSignature } from "../src/education/billing/paddle";
import { runEducationJob } from "../src/education/billing/queue";

const userId = "00000000-0000-4000-8000-000000000001";
const account = () => ({ user_id: userId, tier: "none", status: "none", customer_id: null, subscription_id: null,
  billing_period: null, period_start: null, period_end: null, paid_until: null, grant_anchor: null, last_event_at: null });
const rows = (rows: unknown[] = [], rowCount = rows.length) => ({ rows, rowCount });

test("Education prices, yearly totals and subscriber discounts match the approved catalog", () => {
  assert.deepEqual(plans.map(p => [p.monthlyCents, p.yearlyCents, p.monthlyCredits]), [[900,9000,500],[2900,29000,2000],[7900,79000,6000]]);
  for (const pack of Object.values(catalog.packs)) assert.equal(pack.subscriber.amount, pack.standard.amount * .8);
  assert.deepEqual(Object.values(catalog.packs).map(p => [p.standard.amount,p.credits]), [[500,200],[2200,1000],[6000,3000]]);
});
test("Basic/credit-only quiz pricing, page surcharges and question caps are enforced", () => {
  assert.equal(usagePrice("basic", "quiz", 20, 20).cost, 5);
  assert.equal(usagePrice("none", "quiz", 21, 20).cost, 6);
  assert.equal(usagePrice("basic", "quiz", 50, 20).cost, 7);
  assert.equal(usagePrice("basic", "quiz", 20, 20, true).cost, 2);
  assert.throws(() => usagePrice("basic", "quiz", 20, 21), /20 questions/);
  assert.throws(() => usagePrice("none", "exam", 51), /50 pages/);
});
test("Pro and Max fair-use access, exam costs, queue priority and upload caps", () => {
  assert.deepEqual(usagePrice("pro", "quiz", 100, 50), { cost: 0, includedLimit: 30, priority: 1 });
  assert.equal(usagePrice("pro", "exam", 51).cost, 18);
  assert.equal(usagePrice("pro", "exam", 100).cost, 18);
  assert.equal(usagePrice("pro", "exam", 100, 0, true).cost, 3);
  assert.equal(usagePrice("max", "exam", 300).includedLimit, 10);
  assert.equal(usagePrice("max", "quiz", 300, 50).priority, 2);
  assert.throws(() => usagePrice("pro", "quiz", 101, 10), /100 pages/);
  assert.throws(() => usagePrice("max", "exam", 301), /300 pages/);
});
test("calendar month grants and 12-month expiry handle short months and leap years", () => {
  assert.equal(addMonths(new Date("2028-01-31T12:15:00Z"),1).toISOString(), "2028-02-29T12:15:00.000Z");
  assert.equal(addMonths(new Date("2028-02-29T12:15:00Z"),12).toISOString(), "2029-02-28T12:15:00.000Z");
});
test("active-looking unpaid or expired subscriptions cannot grant entitlements", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  const a = { ...account(), tier: "max", status: "active", period_end: new Date("2030-02-01"), paid_until: null };
  assert.equal(activeTier(a as any, now), "none");
  a.paid_until = new Date("2030-02-01") as any;
  assert.equal(activeTier(a as any, now), "max");
  assert.equal(activeTier({ ...a, status: "past_due" } as any, now), "none");
  assert.equal(activeTier(a as any, new Date("2030-03-01")), "none");
});
test("Paddle HMAC verifies exact bytes, rejects tampering, malformed signatures and replay", () => {
  const now = 1_900_000_000_000, ts = Math.floor(now / 1000), secret = "test-only-signing-key";
  const raw = Buffer.from('{"event_id":"example"}');
  const h1 = createHmac("sha256",secret).update(`${ts}:`).update(raw).digest("hex");
  assert.equal(verifyPaddleSignature(raw,`ts=${ts};h1=${h1}`,secret,now),true);
  assert.equal(verifyPaddleSignature(Buffer.from('{"event_id": "example"}'),`ts=${ts};h1=${h1}`,secret,now),false);
  assert.equal(verifyPaddleSignature(raw,`ts=${ts};h1=${h1}`,secret,now+6000),false);
  assert.equal(verifyPaddleSignature(raw,`ts=${ts};h1=bad`,secret,now),false);
  assert.equal(verifyPaddleSignature(raw,`ts=${ts};h1=bad;h1=${h1}`,secret,now),true);
});
test("annual subscriptions grant monthly, never the entire annual allocation at once", async () => {
  const inserts: unknown[][] = [];
  const a = { ...account(), tier: "pro", status: "active", subscription_id: "sub_test",
    grant_anchor: new Date("2030-01-31T00:00:00Z"), period_end: new Date("2031-01-31T00:00:00Z"), paid_until: new Date("2031-01-31T00:00:00Z") };
  const client = { query: async (_sql: string, params: unknown[]) => { inserts.push(params); return rows(); } };
  await refreshMonthlyGrants(client as any, a as any, new Date("2030-03-01T00:00:00Z"));
  assert.equal(inserts.length,2);
  assert.deepEqual(inserts.map(p => p[2]),[2000,2000]);
  assert.equal((inserts[1]![4] as Date).toISOString(),"2030-02-28T00:00:00.000Z");
});
test("settlement spends expiring Education lots first and never touches the Dodo wallet", async () => {
  const updates: { sql: string; args: unknown[] }[] = [];
  const client = { query: async (sql: string, args: unknown[] = []) => {
    if (sql.includes("SELECT * FROM education_billing_accounts")) return rows([account()]);
    if (sql.includes("SELECT * FROM education_usage_holds")) return rows([{ status: "pending",cost: 15 }]);
    if (sql.includes("SELECT id,remaining")) return rows([{ id: "soon",remaining: 5 },{ id: "later",remaining: 20 }]);
    updates.push({ sql,args }); return rows();
  } };
  await settleEducationCharge(client as any,{ holdId: "hold",userId });
  const spends = updates.filter(q => q.sql.startsWith("UPDATE education_credit_lots"));
  assert.deepEqual(spends.map(q => q.args),[["soon",5],["later",10]]);
  assert.ok(updates.some(q => q.sql.includes("status='completed'")));
  assert.ok(updates.every(q => !/\bUPDATE users\b/.test(q.sql)));
});
test("an expired or already-completed hold cannot charge twice", async () => {
  for (const status of [undefined,"completed"]) {
    let updates = 0;
    const client = { query: async (sql: string) => {
      if (sql.includes("SELECT * FROM education_billing_accounts")) return rows([account()]);
      if (sql.includes("SELECT * FROM education_usage_holds")) return rows(status ? [{ status,cost: 5 }] : []);
      if (sql.startsWith("UPDATE")) updates++;
      return rows();
    } };
    await assert.rejects(settleEducationCharge(client as any,{ holdId:"hold",userId }),/reservation expired/);
    assert.equal(updates,0);
  }
});
test("Pro daily included quiz cap rejects without creating a paid fallback hold", async context => {
  let held = false;
  const a = { ...account(),tier:"pro",status:"active",paid_until:new Date(Date.now()+86400000),period_end:new Date(Date.now()+86400000) };
  const query = async (sql: string) => {
    if (sql.includes("SELECT * FROM education_billing_accounts")) return rows([a]);
    if (sql.includes("SELECT count(*) AS used")) return rows([{used:30}]);
    if (sql.includes("SELECT id FROM education_usage_holds")) return rows();
    if (sql.startsWith("INSERT INTO education_usage_holds")) held=true;
    return rows();
  };
  context.mock.method(pool,"query",query);
  context.mock.method(pool,"connect",async () => ({query,release:()=>{}}));
  await assert.rejects(reservePaidUsage(userId,"quiz",[{}],20,"hash"),/30 quizzes/);
  assert.equal(held,false);
});
test("settled pack grants once, tax never buys extra credits and forged custom_data is ignored", async context => {
  const price = catalog.packs.small.standard;
  let minted = 0, settled = false;
  const txn = { id:"txn_example",status:"completed",currency_code:"USD",customer_id:"ctm_test",
    billed_at:"2030-01-01T00:00:00Z",custom_data:{userId:"attacker",credits:900000},
    items:[{quantity:1,price:{id:price.priceId,product_id:catalog.packs.small.productId,unit_price:{amount:"500",currency_code:"USD"}}}],
    details:{totals:{subtotal:"500",tax:"100",total:"600"}},adjustments:[] };
  const query = async (sql: string, args: any[] = []) => {
    if (sql.includes("SELECT * FROM education_billing_checkouts")) return rows([{user_id:userId,price_id:price.priceId,expected_amount:500,status:"pending"}]);
    if (sql.includes("SELECT * FROM education_billing_accounts")) return rows([account()]);
    if (sql.startsWith("INSERT INTO education_billing_settlements")) {
      if (settled) return rows();
      settled=true; return rows([{transaction_id:txn.id}]);
    }
    if (sql.includes("INSERT INTO education_credit_lots")) { assert.equal(args[1],userId); minted+=args[2]; }
    return rows();
  };
  context.mock.method(pool,"query",query);
  context.mock.method(pool,"connect",async () => ({query,release:()=>{}}));
  context.mock.method(globalThis,"fetch",async () => new Response(JSON.stringify({data:txn}),{status:200}));
  const previous = process.env.PADDLE_API_KEY; process.env.PADDLE_API_KEY="unit-test-only";
  try {
    assert.equal(await fulfillTransaction(txn.id),"completed");
    assert.equal(await fulfillTransaction(txn.id),"completed");
    assert.equal(minted,200);
  } finally { if(previous===undefined) delete process.env.PADDLE_API_KEY; else process.env.PADDLE_API_KEY=previous; }
});
test("failed/pending payments grant nothing and altered catalog prices are rejected", async context => {
  let status="paid", writes=0;
  context.mock.method(pool,"query",async () => { writes++; return rows(); });
  context.mock.method(globalThis,"fetch",async () => new Response(JSON.stringify({data:{
    status,items:[{quantity:1,price:{id:catalog.packs.small.standard.priceId,product_id:catalog.packs.small.productId,unit_price:{amount:"1",currency_code:"USD"}}}],
  }}),{status:200}));
  const previous=process.env.PADDLE_API_KEY; process.env.PADDLE_API_KEY="unit-test-only";
  try {
    assert.equal(await fulfillTransaction("txn_test"),"pending");
    status="completed";
    await assert.rejects(fulfillTransaction("txn_test"),/does not match/);
    assert.equal(writes,0);
  } finally { if(previous===undefined)delete process.env.PADDLE_API_KEY;else process.env.PADDLE_API_KEY=previous; }
});
test("the bounded queue prioritizes Max then Pro while preserving FIFO ties", async () => {
  const release: (() => void)[] = [];
  const running = Array.from({length:4},()=>runEducationJob(0,()=>new Promise<void>(resolve=>release.push(resolve))));
  const order: string[]=[];
  const queued = [runEducationJob(0,async()=>{order.push("standard");}),runEducationJob(1,async()=>{order.push("pro");}),runEducationJob(2,async()=>{order.push("max");})];
  release[0]!();
  await Promise.all(queued);
  assert.deepEqual(order,["max","pro","standard"]);
  release.slice(1).forEach(done=>done());
  await Promise.all(running);
});
