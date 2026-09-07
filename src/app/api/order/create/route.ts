import { NextResponse } from "next/server";
import { z } from "zod";
import { EVENTS, track } from "@/lib/analytics";
import { loadPack } from "@/lib/content";
import { prisma } from "@/lib/db";
import { detectScene, getProvider } from "@/lib/pay";
import { quote } from "@/lib/pricing";
import { ensureSessionKey, generateRetrieveCode } from "@/lib/session";
import { canAuthorize, readOpenId } from "@/lib/wechat/identity";

export const runtime = "nodejs";

/**
 * openId 只从签名 Cookie 读，绝不接受客户端传入。
 * 否则任何人只要知道别人的 openId 就能查到对方订单的找回码。
 */
const bodySchema = z.object({
  attemptId: z.string().min(1).max(64),
});

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL 未配置");
  return url.replace(/\/$/, "");
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const { attemptId } = parsed.data;

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, deletedAt: null },
    select: { id: true, slug: true, packVersion: true },
  });
  if (!attempt) return NextResponse.json({ error: "结果不存在" }, { status: 404 });

  const pack = loadPack(attempt.slug, attempt.packVersion);
  const sessionKey = await ensureSessionKey();
  const openId = await readOpenId();
  const scene = detectScene(req.headers.get("user-agent"));

  // 已支付的不重复下单
  const existing = await prisma.order.findFirst({
    where: {
      attemptId,
      status: "PAID",
      OR: [{ sessionKey }, ...(openId ? [{ openId }] : [])],
    },
    select: { id: true, retrieveCode: true },
  });
  if (existing) {
    return NextResponse.json({ alreadyPaid: true, retrieveCode: existing.retrieveCode });
  }

  const provider = getProvider();

  // 微信内 JSAPI 支付必须先拿到 openid，把用户送去静默授权再回来
  if (provider.id === "wechat" && scene === "wechat" && !openId) {
    if (!canAuthorize()) {
      return NextResponse.json({
        prepay: {
          kind: "unsupported",
          reason: "微信支付尚未配置完成",
          guidance: "请稍后再试，或点右上角在浏览器中打开后继续。",
        },
      });
    }
    const next = `/r/${attemptId}`;
    return NextResponse.json({
      prepay: {
        kind: "auth",
        url: `/api/wechat/auth?next=${encodeURIComponent(next)}`,
      },
    });
  }

  // 下单时重新算一遍价，不复用前端展示过的报价。
  // 客户端从头到尾不发送价格，改不了任何东西。
  const priced = await quote(attemptId, { sessionKey, openId }, pack.paywall);

  const order = await prisma.order.create({
    data: {
      attemptId,
      sessionKey,
      openId,
      provider: provider.id,
      amount: priced.amount,
      currency: pack.paywall.price.currency,
      discountId: priced.discount?.id,
      retrieveCode: generateRetrieveCode(),
    },
  });

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "0.0.0.0";

  let prepay;
  try {
    prepay = await provider.prepay({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      description: `${pack.meta.name} - ${pack.paywall.productName}`,
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL ?? `${siteUrl()}/api/pay/notify/${provider.id}`,
      // Next 开发服务器可能将 req.url 的主机名规范化为 localhost。
      // mock 使用相对地址，保留浏览器原域名上的匿名身份 Cookie。
      returnUrl: `${provider.id === "mock" ? "" : siteUrl()}/r/${attemptId}/report`,
      scene,
      openId: openId ?? undefined,
      clientIp,
    });
  } catch (err) {
    console.error("[pay] 预下单失败", err);
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return NextResponse.json(
      { error: "下单失败，请稍后再试" },
      { status: 502 },
    );
  }

  await track(sessionKey, EVENTS.orderCreate, {
    slug: attempt.slug,
    attemptId,
    props: {
      orderId: order.id,
      provider: provider.id,
      kind: prepay.kind,
      amount: order.amount,
      discounted: priced.discount !== null,
    },
  });

  return NextResponse.json({ orderId: order.id, retrieveCode: order.retrieveCode, prepay });
}
