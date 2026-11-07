import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { pool } from "@workspace/db";
import { usdToCreditCents } from "../src/lib/creditAmounts";
import { customPriceInfo, customTopUpQuote } from "../src/education/billing/custom-topups";
import { fulfillTransaction, handlePaddleEvent } from "../src/education/billing/paddle";
import { educationBillingRouter } from "../src/education/billing/routes";
import { createCreditCheckout, CREDITS_PER_USD, MIN_CREDITS_USD, MAX_CREDITS_USD } from "../src/dodo";

const userId = "00000000-0000-4000-8000-000000000001";
const rows = (data: any[] = []) => ({ rows: data, rowCount: data.length });
const account = { user_id: userId, tier: "none", status: "none", customer_id: "ctm_unit", subscription_id: null,
  paid_until: null, period_end: null };
function fixture(credits = 200) {
  const checkout = { transaction_id: "txn_custom_unit", user_id: userId, kind: "custom", price_id: "pri_custom_unit",
    expected_amount: 500, expected_credits: credits, expected_product_id: "pro_custom_unit", status: "pending" };
  const transaction = { id: checkout.transaction_id, status: "completed", currency_code: "USD", customer_id: "ctm_unit",
    billed_at: "2030-01-01T00:00:00Z", custom_data: { credits: 999999, userId: "not-the-owner" },
    items: [{ quantity: 1, price: { id: checkout.price_id, product_id: checkout.expected_product_id,
      billing_cycle: null, unit_price: { amount: "500", currency_code: "USD" } } }],
    details: { totals: { subtotal: "500", discount: "0", tax: "100", total: "600" } }, adjustments: [] as any[] };
  return { checkout, transaction };
}
function testEnv(t: any) {
  for (const [key, value] of Object.entries({ PADDLE_API_KEY: "unit-test-only", PADDLE_WEBHOOK_SECRET: "unit-test-only",
    PADDLE_CLIENT_TOKEN: "test-public-unit-token", PADDLE_CHECKOUT_BASE_URL: "https://example.com" })) {
    const old = process.env[key]; process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
}
test("both wallets accept exact cents from $5 to $500 and reject malformed/sub-cent amounts", () => {
  for (const [amount, cents] of [["5",500],["5.01",501],[12.34,1234],["500.00",50000]] as const)
    assert.equal(usdToCreditCents(amount),cents);
  for (const invalid of [null,true,[5],{},"","NaN","Infinity","5e1","5.001","4.99","500.01",-5,NaN,Infinity])
    assert.throws(() => usdToCreditCents(invalid));
  assert.equal(MIN_CREDITS_USD,5); assert.equal(MAX_CREDITS_USD,500); assert.equal(CREDITS_PER_USD,100);
});
test("Education quotes preserve separate regular/subscriber rates and round fractional credits down", () => {
  assert.deepEqual(customTopUpQuote(500,false),{ amount:500,credits:200 });
  assert.deepEqual(customTopUpQuote(500,true),{ amount:500,credits:250 });
  assert.equal(customTopUpQuote(501,false).credits,200);
  assert.equal(customTopUpQuote(501,true).credits,250);
  assert.equal(customTopUpQuote(50000,true).credits,25000);
  for (const bad of [499,50001,500.5,NaN,Infinity]) assert.throws(() => customTopUpQuote(bad,false));
});
test("general checkout rejects invalid or forged credit counts before contacting Dodo", async () => {
  const request = { user: { id:userId,email:"unit@example.com",name:null },returnUrl:"https://example.com" };
  for (const [amountCents,credits] of [[499,499],[50001,50001],[500.5,500.5],[500,999999]])
    await assert.rejects(createCreditCheckout({ ...request,amountCents,credits }),/Invalid general credit top-up/);
});
test("Paddle non-catalog top-ups require the exact owned order, product, amount, currency and quantity", () => {
  const {checkout,transaction}=fixture();
  assert.equal(customPriceInfo(transaction,checkout)?.credits,200);
  assert.equal(customPriceInfo(transaction,undefined),undefined);
  const variants = [
    { ...checkout,transaction_id:"another" }, { ...checkout,expected_credits:999999 },
    { ...checkout,expected_amount:499 }, { ...checkout,kind:"pack" }, { ...checkout,price_id:"another" },
  ];
  for (const altered of variants) assert.equal(customPriceInfo(transaction,altered),undefined);
  for (const mutate of [
    (v:any)=>v.items[0].quantity=2, (v:any)=>v.items[0].price.product_id="unrelated",
    (v:any)=>v.items[0].price.unit_price.amount="499", (v:any)=>v.items[0].price.billing_cycle={interval:"month"},
    (v:any)=>v.currency_code="EUR", (v:any)=>v.details.totals.discount="100",
    (v:any)=>v.details.totals.subtotal="400",
  ]) {
    const changed=structuredClone(transaction); mutate(changed);
    assert.equal(customPriceInfo(changed,checkout),undefined);
  }
});
test("paid custom top-up grants only the locked subscriber quote, once, with 12-month expiry and no Dodo writes", async t => {
  testEnv(t);
  const {checkout,transaction}=fixture(250); // Subscriber may have expired since checkout.
  let settled=false, minted=0;
  const query=async (sql:string,args:any[]=[]) => {
    assert.ok(!/\bUPDATE users\b/.test(sql));
    if(sql.includes("SELECT kind FROM education_billing_checkouts")) return rows([{kind:"custom"}]);
    if(sql.includes("SELECT * FROM education_billing_checkouts")) return rows([checkout]);
    if(sql.includes("SELECT * FROM education_billing_accounts")) return rows([account]);
    if(sql.startsWith("INSERT INTO education_billing_settlements")) {
      if(settled)return rows(); settled=true; return rows([{transaction_id:transaction.id}]);
    }
    if(sql.includes("INSERT INTO education_credit_lots")) {
      minted+=args[2]; assert.equal(args[1],userId);
      assert.equal(args[3].toISOString(),"2031-01-01T00:00:00.000Z");
    }
    return rows();
  };
  t.mock.method(pool,"query",query);
  t.mock.method(pool,"connect",async()=>({query,release(){}}));
  t.mock.method(globalThis,"fetch",async()=>new Response(JSON.stringify({data:transaction}),{status:200}));
  await handlePaddleEvent({event_id:"evt_custom_unit",event_type:"transaction.completed",
    occurred_at:"2030-01-01T00:00:00Z",data:{id:transaction.id}});
  assert.equal(await fulfillTransaction(transaction.id),"completed");
  assert.equal(minted,250); // Neither the $1 tax nor forged metadata buys credits.
});
test("pending, canceled and failed custom payments never grant credits", async t => {
  testEnv(t); let writes=0;
  t.mock.method(pool,"query",async()=>{writes++;return rows();});
  const {transaction}=fixture();
  let status="ready";
  t.mock.method(globalThis,"fetch",async()=>new Response(JSON.stringify({data:{...transaction,status}}),{status:200}));
  for(status of ["ready","paid","canceled","past_due"]) {
    assert.equal(await fulfillTransaction(transaction.id),status==="canceled"?"canceled":"pending");
  }
  assert.equal(writes,0);
});
test("custom top-up refunds reduce only their Education lot and duplicate events do not revoke twice", async t => {
  testEnv(t);
  const {checkout,transaction}=fixture(250); let refunded=false, removed=0;
  const adjustment={id:"adj_unit",action:"refund",status:"approved",transaction_id:transaction.id,totals:{total:"600"}};
  const query=async(sql:string,args:any[]=[])=>{
    assert.ok(!/\bUPDATE users\b/.test(sql));
    if(sql.includes("SELECT user_id FROM education_billing_checkouts"))return rows([{user_id:userId}]);
    if(sql.includes("SELECT * FROM education_billing_checkouts"))return rows([checkout]);
    if(sql.includes("SELECT * FROM education_billing_accounts"))return rows([account]);
    if(sql.startsWith("INSERT INTO education_billing_refunds")) {
      if(refunded)return rows();refunded=true;return rows([{id:adjustment.id}]);
    }
    if(sql.startsWith("UPDATE education_credit_lots")) {removed+=args[1];assert.equal(args[0],`purchase:${transaction.id}`);}
    return rows();
  };
  t.mock.method(pool,"query",query);t.mock.method(pool,"connect",async()=>({query,release(){}}));
  t.mock.method(globalThis,"fetch",async(url:any)=>new Response(JSON.stringify({data:String(url).includes("/adjustments/")?adjustment:transaction}),{status:200}));
  const event={event_id:"evt_unit",event_type:"adjustment.updated",occurred_at:"2030-01-02T00:00:00Z",data:{id:adjustment.id}};
  await handlePaddleEvent(event); await handlePaddleEvent(event);
  assert.equal(removed,250);
});
test("Education checkout validates input, chooses subscriber rate on server, and persists the exact non-catalog order", async t => {
  testEnv(t);
  let saved:any[]=[], sent:any, creates=0;
  const paidAccount={...account,tier:"pro",status:"active",paid_until:new Date(Date.now()+86400000),period_end:new Date(Date.now()+86400000)};
  const query=async(sql:string,args:any[]=[])=>{
    if(sql.includes("SELECT * FROM education_billing_accounts"))return rows([paidAccount]);
    if(sql.includes("INSERT INTO education_billing_checkouts"))saved=args;
    return rows();
  };
  t.mock.method(pool,"query",query);t.mock.method(pool,"connect",async()=>({query,release(){}}));
  const realFetch=globalThis.fetch;
  t.mock.method(globalThis,"fetch",async(input:any,init:any)=>{
    if(!String(input).includes("api.paddle.com")) return realFetch(input,init);
    sent=JSON.parse(init.body);creates++;
    return new Response(JSON.stringify({data:{id:"txn_custom_unit",checkout:{url:"https://example.com/education/pricing"},
      items:[{price:{id:"pri_custom_unit",product_id:"pro_custom_unit"}}]}}),{status:200});
  });
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{req.user={id:userId,email:"unit@example.com",name:"Unit"} as any;req.headers.authorization="Bearer unit-test";next();});
  app.use("/billing",educationBillingRouter);
  const server=app.listen(0,"127.0.0.1");
  await new Promise<void>(resolve=>server.once("listening",resolve));
  t.after(()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
  const url=`http://127.0.0.1:${(server.address() as any).port}/billing/checkout`;
  for(const amountCents of [499,50001,500.5,"500"]) {
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"custom",amountCents})});
    assert.equal(r.status,400);
  }
  assert.equal(creates,0);
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({kind:"custom",amountCents:501,credits:999999,subscriber:false})});
  assert.equal(r.status,200);
  assert.equal(sent.items[0].price.unit_price.amount,"501");
  assert.equal(sent.items[0].price.product.name,"PDF Genius Education credits");
  assert.equal(sent.items[0].price.product.tax_category,"saas");
  assert.equal(sent.items[0].price.billing_cycle,null);
  assert.equal(sent.items[0].quantity,1);
  assert.deepEqual(saved,["txn_custom_unit",userId,"custom","pri_custom_unit",501,250,"pro_custom_unit"]);
});
