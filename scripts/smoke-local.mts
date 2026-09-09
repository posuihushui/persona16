import assert from "node:assert/strict";
import fs from "node:fs";

try { process.loadEnvFile(); } catch { /* 显式传入环境时不需要.env */ }
const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
assert.ok(local.has(new URL(base).hostname), "此脚本只允许本地服务");
assert.equal(process.env.PAY_PROVIDER, "mock", "此脚本只允许 mock 支付");
assert.ok(local.has(new URL(process.env.DATABASE_URL!).hostname), "此脚本只允许本地数据库");
const pack = JSON.parse(fs.readFileSync("content/tests/persona16/questions.json", "utf8"));
const answers = Object.fromEntries(pack.questions.map((q: { id: string }) => [q.id, 2]));
let cookie = "";
const call = async (route: string, body?: unknown, authenticated = true) => {
  const res = await fetch(new URL(route, base), {
    method: body === undefined ? "GET" : "POST", redirect: "manual",
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(authenticated && cookie ? { cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (authenticated) {
    const set = res.headers.getSetCookie().map((value) => value.split(";")[0]);
    if (set.length) cookie = [...cookie.split("; ").filter(Boolean), ...set].join("; ");
  }
  return res;
};
const body = { slug: "persona16", packVersion: pack.version, answers, source: "local-optimization-smoke" };
assert.equal((await call("/api/submit", { ...body, packVersion: "0.0.0" })).status, 409);
assert.equal((await call("/api/submit", { ...body, answers: {} })).status, 400);
assert.equal((await call("/api/submit", { ...body, answers: { ...answers, [pack.questions[0].id]: 9 } })).status, 400);
const submitted = await call("/api/submit", body);
assert.equal(submitted.status, 200);
const { attemptId, code } = await submitted.json();
const doc = JSON.parse(fs.readFileSync(`content/tests/persona16/results/${code}.json`, "utf8"));
/*
 * 认知正文在报告里按启动顺序拆成四层分别渲染，整串不会原样出现在 HTML 里。
 * 所以付费边界改成逐段断言：付费页每一段都要在，公开出口每一段都不许在。
 * 逐段比整串更严——整串只要有一段被单独漏出去就检查不到。
 */
const cognitionParts: string[] = doc.cognition.split(/\n{2,}/).map((p: string) => p.trim()).filter(Boolean);
const hasAllCognition = (html: string) => cognitionParts.every((part) => html.includes(part));
const hasAnyCognition = (html: string) => cognitionParts.some((part) => html.includes(part));
const resultPath = `/r/${attemptId}`;
const resultHtml = await (await call(resultPath)).text();
assert.match(resultHtml, /name="robots" content="noindex/);
assert.ok(resultHtml.includes(`/t/persona16/type/${code}`));
assert.ok(!resultHtml.includes(doc.core), "免费结果不得包含完整性格描述");
assert.ok(!hasAnyCognition(resultHtml), "免费HTML不得包含付费认知正文");
const free = await (await call(`/api/result/${attemptId}`)).json();
assert.equal(free.paid, false);
assert.equal(free.result.cognition, undefined);
assert.equal(free.result.core, undefined);
assert.equal(free.dimensions.length, 4);
const privateBefore = await call(`${resultPath}/report`);
assert.equal(privateBefore.status, 307);
const foreignClaim = await call("/api/discount/claim", { attemptId }, false);
assert.equal(foreignClaim.status, 403);
const discount1 = await (await call("/api/discount/claim", { attemptId })).json();
const discount2 = await (await call("/api/discount/claim", { attemptId })).json();
assert.equal(discount1.expiresAt, discount2.expiresAt);
const created = await (await call("/api/order/create", { attemptId, amount: 1, discount: 99 })).json();
assert.equal(created.prepay.kind, "mock");
const { prisma } = await import("../src/lib/db.ts");
try {
  const persistedOrder = await prisma.order.findUniqueOrThrow({ where: { id: created.orderId } });
  assert.equal(persistedOrder.amount, discount1.amount, "订单金额必须由服务端报价决定");
  assert.notEqual(persistedOrder.amount, 1, "忽略客户端注入的价格");
} finally {
  await prisma.$disconnect();
}
assert.equal((await call(`/api/order/${created.orderId}/status`, undefined, false)).status, 403);
const callback = await call(created.prepay.url);
assert.ok(callback.status < 400);
assert.equal(callback.headers.get("location"), `${resultPath}/report`, "模拟支付必须同源返回，保留匿名购买身份");
assert.ok((await call(created.prepay.url)).status < 400, "重复回调必须幂等成功");
const status = await (await call(`/api/order/${created.orderId}/status`)).json();
assert.equal(status.paid, true);
assert.ok(status.retrieveCode);
const paidHtml = await (await call(`${resultPath}/report`)).text();
assert.ok(hasAllCognition(paidHtml), "付费报告必须包含完整认知正文的每一层");
assert.match(paidHtml, /name="robots" content="noindex/);
assert.equal((await call(`${resultPath}/report`, undefined, false)).status, 307);
const retrieved = await (await call(`${resultPath}/report?code=${encodeURIComponent(status.retrieveCode)}`, undefined, false)).text();
assert.ok(hasAllCognition(retrieved), "凭找回码打开的报告同样要有完整认知正文");
const alreadyPaid = await (await call("/api/order/create", { attemptId })).json();
assert.equal(alreadyPaid.alreadyPaid, true);
const publicType = await (await call(`/t/persona16/type/${code}`, undefined, false)).text();
assert.ok(!publicType.includes(doc.core));
assert.ok(!hasAnyCognition(publicType), "公开类型页不得出现任何一段付费认知正文");
const llms = await (await call("/llms-full.txt", undefined, false)).text();
assert.ok(!llms.includes(doc.core));
assert.ok(!hasAnyCognition(llms), "llms 出口不得出现任何一段付费认知正文");
for (const filename of fs.readdirSync("content/tests/persona16/results")) {
  const type = filename.replace(".json", "");
  const res = await call(`/api/og?slug=persona16&code=${type}&version=${pack.version}`, undefined, false);
  assert.equal(res.status, 200);
  const svg = await res.text();
  assert.match(svg, /width="900" height="1200"/);
  assert.ok(!svg.includes(attemptId));
}
assert.equal((await call("/api/og?slug=../&code=INFP")).status, 404);
assert.equal((await call("/api/og?code=constructor")).status, 404);
console.log("本地验收通过：提交校验、免费边界、noindex、折扣幂等、模拟支付、未授权拦截、跨会话找回、公开出口、16张分享卡。");
console.log(`本地合成测试结果：${base}${resultPath}`);
