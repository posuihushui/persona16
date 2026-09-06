import { NextResponse } from "next/server";
import { z } from "zod";
import { EVENTS, track } from "@/lib/analytics";
import { loadPack } from "@/lib/content";
import { prisma } from "@/lib/db";
import { claimDiscount, quote } from "@/lib/pricing";
import { ensureSessionKey } from "@/lib/session";
import { readOpenId } from "@/lib/wechat/identity";

export const runtime = "nodejs";

const bodySchema = z.object({
  attemptId: z.string().min(1).max(64),
});

/**
 * 领取折扣券。
 *
 * 客户端只说「我要领」，折扣力度和有效期全部由服务端按内容包配置写死，
 * 请求里不接受任何价格或时长参数。
 *
 * 券绑定到本人的会话，别人拿到结果页链接领不了，也用不了。
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const { attemptId } = parsed.data;

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!attempt) return NextResponse.json({ error: "结果不存在" }, { status: 404 });

  const pack = loadPack(attempt.slug);
  if (!pack.paywall.discount) {
    return NextResponse.json({ error: "当前没有可领的优惠" }, { status: 409 });
  }

  const sessionKey = await ensureSessionKey();
  const openId = await readOpenId();
  const viewer = { sessionKey, openId };

  const result = await claimDiscount(attemptId, viewer, pack.paywall);
  if (!result.ok) {
    const message =
      result.reason === "not-owner"
        ? "这份结果不是你的，无法领取"
        : "当前没有可领的优惠";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const priced = await quote(attemptId, viewer, pack.paywall);

  await track(sessionKey, EVENTS.discountClaim, {
    slug: attempt.slug,
    attemptId,
    props: { percent: result.discount.percent, kind: result.discount.kind },
  });

  return NextResponse.json({
    percent: result.discount.percent,
    expiresAt: result.discount.expiresAt.toISOString(),
    amount: priced.amount,
    listAmount: priced.listAmount,
  });
}
