import { EVENTS, track } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/pay";
import { consumeDiscount } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * 支付回调。这是权益发放的唯一依据，前端的支付成功回调只用于刷新界面。
 * 必须验签、幂等。重复回调不得重复发放（agents.md 数据与权限约定）。
 */
async function handle(req: Request, providerId: string): Promise<Response> {
  let provider;
  try {
    provider = getProvider(providerId);
  } catch {
    return new Response("unknown provider", { status: 404 });
  }

  let notify;
  try {
    notify = await provider.parseNotify(req);
  } catch (err) {
    console.error("[pay] 回调解析或验签失败", err);
    return provider.ack(false, "验签失败");
  }

  const order = await prisma.order.findUnique({
    where: { id: notify.orderId },
    select: {
      id: true,
      status: true,
      amount: true,
      attemptId: true,
      sessionKey: true,
      openId: true,
      discountId: true,
    },
  });
  if (!order) return provider.ack(false, "订单不存在");

  // 幂等：同一个事件只处理一次
  try {
    await prisma.paymentEvent.create({
      data: {
        orderId: order.id,
        provider: providerId,
        eventId: notify.eventId,
        payload: notify.raw as object,
      },
    });
  } catch {
    // 唯一索引冲突说明这个事件已经处理过
    return provider.ack(true);
  }

  if (!notify.paid) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED", providerTradeNo: notify.tradeNo },
    });
    return provider.ack(true);
  }

  // 金额核对，防止篡改。mock 不上报金额，跳过。
  if (notify.amount > 0 && notify.amount !== order.amount) {
    console.error(`[pay] 订单 ${order.id} 金额不符 期望=${order.amount} 实收=${notify.amount}`);
    return provider.ack(false, "金额不符");
  }

  if (order.status !== "PAID") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date(), providerTradeNo: notify.tradeNo },
    });
    if (order.discountId) await consumeDiscount(order.discountId, order.id);
    await track(order.sessionKey, EVENTS.orderPaid, {
      attemptId: order.attemptId,
      props: { orderId: order.id, provider: providerId, amount: order.amount },
    });
  }

  return provider.ack(true);
}

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  return handle(req, provider);
}

/** mock 支付用 GET 从确认页回来，生产的微信回调只走 POST。 */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "mock") return new Response("method not allowed", { status: 405 });

  const res = await handle(req, provider);
  if (res.status >= 400) return res;

  // 只允许跳回本站，避免开放重定向
  const redirect = new URL(req.url).searchParams.get("redirect");
  if (redirect) {
    // 本地模拟返回保留当前浏览器域名，不使用可能已被规范化的 req.url。
    // 严格限制为报告路径，拒绝协议相对 URL、反斜杠和外站跳转。
    if (/^\/r\/[a-zA-Z0-9_-]+\/report$/.test(redirect)) {
      return new Response(null, { status: 303, headers: { location: redirect } });
    }
    const target = new URL(redirect, req.url);
    const allowed = new Set([new URL(req.url).origin]);
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    }
    if (allowed.has(target.origin)) {
      return Response.redirect(target, 303);
    }
  }
  return res;
}
