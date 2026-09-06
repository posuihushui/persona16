#!/usr/bin/env node --experimental-strip-types
/**
 * 人工退款。
 *
 *   npm run refund -- --order <订单号> --reason "内容与承诺不符" --operator 你的名字
 *   加 --yes 才会真正发起，不加只做检查并打印将要执行的动作。
 *
 * 用户协议承诺：内容与付费页承诺不符可在 7 天内申请全额退款。
 * 这个脚本是那条承诺的执行工具，不是摆设。
 *
 * 退款单号用数据库里的 Refund.id，唯一约束保证同一笔不会重复退。
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(file: string): void {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const raw of fs.readFileSync(full, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const { prisma } = await import("../src/lib/db.ts");
const { getProvider } = await import("../src/lib/pay/index.ts");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const orderId = arg("order");
const reason = arg("reason");
const operator = arg("operator");
const amountArg = arg("amount");
const confirmed = process.argv.includes("--yes");

if (!orderId || !reason) {
  console.error(
    "用法: npm run refund -- --order <订单号> --reason <理由> [--amount <分>] [--operator <姓名>] [--yes]",
  );
  process.exit(1);
}

const order = await prisma.order.findUnique({
  where: { id: orderId },
  select: {
    id: true,
    status: true,
    amount: true,
    currency: true,
    provider: true,
    paidAt: true,
    providerTradeNo: true,
    attemptId: true,
    retrieveCode: true,
  },
});

async function abort(message: string): Promise<never> {
  console.error(message);
  await prisma.$disconnect();
  process.exit(1);
}

if (!order) await abort(`订单不存在: ${orderId}`);

if (order.status !== "PAID") {
  await abort(`订单状态是 ${order.status}，只有 PAID 的订单可以退款`);
}

const refundAmount = amountArg ? Number(amountArg) : order.amount;
if (!Number.isInteger(refundAmount) || refundAmount <= 0 || refundAmount > order.amount) {
  await abort(`退款金额不合法: ${refundAmount}，订单总额 ${order.amount} 分`);
}

const existing = await prisma.refund.findFirst({
  where: { orderId: order.id, status: { in: ["PROCESSING", "SUCCESS"] } },
  select: { id: true, status: true, amount: true },
});
if (existing) {
  await abort(
    `该订单已有退款记录 ${existing.id}（${existing.status}，${existing.amount} 分），不重复发起`,
  );
}

const yuan = (cents: number) => (cents / 100).toFixed(2);

console.log("");
console.log("将要发起的退款");
console.log(`  订单        ${order.id}`);
console.log(`  支付方式    ${order.provider}`);
console.log(`  平台交易号  ${order.providerTradeNo ?? "无"}`);
console.log(`  支付时间    ${order.paidAt?.toISOString() ?? "无"}`);
console.log(`  订单金额    ¥${yuan(order.amount)}`);
console.log(`  退款金额    ¥${yuan(refundAmount)}`);
console.log(`  理由        ${reason}`);
console.log(`  操作人      ${operator ?? "未填写"}`);
console.log("");

if (!confirmed) {
  console.log("这是预演，没有发起任何退款。确认无误后加 --yes 重新执行。");
  await prisma.$disconnect();
  process.exit(0);
}

const record = await prisma.refund.create({
  data: {
    orderId: order.id,
    provider: order.provider,
    amount: refundAmount,
    reason,
    operator,
  },
  select: { id: true },
});

try {
  const result = await getProvider(order.provider).refund({
    orderId: order.id,
    refundId: record.id,
    refundAmount,
    totalAmount: order.amount,
    currency: order.currency,
    reason,
  });

  // 微信返回 SUCCESS 表示已到账，PROCESSING 表示受理中，以退款回调或后续查询为准
  const status = result.status === "SUCCESS" ? "SUCCESS" : "PROCESSING";

  await prisma.$transaction([
    prisma.refund.update({
      where: { id: record.id },
      data: { providerRefundId: result.providerRefundId, status },
    }),
    ...(status === "SUCCESS" && refundAmount === order.amount
      ? [prisma.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } })]
      : []),
  ]);

  console.log(`退款已发起：${record.id} → 平台单号 ${result.providerRefundId}，状态 ${status}`);
  if (status === "PROCESSING") {
    console.log("状态是受理中，实际到账以微信商户平台为准，通常 1 到 3 个工作日。");
  }
} catch (err) {
  await prisma.refund.update({ where: { id: record.id }, data: { status: "ABNORMAL" } });
  console.error(`退款失败，记录 ${record.id} 已标记为 ABNORMAL`);
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
}

// 数据库连接池会吊住事件循环，必须显式断开
await prisma.$disconnect();
