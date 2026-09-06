import { prisma } from "./db";
import type { Paywall } from "./types";

/**
 * 定价。
 *
 * 价格只在服务端算，客户端从头到尾不参与。前端拿到的是一个已经算好的金额，
 * 它既不发送价格也不发送折扣码，改不了任何东西。
 * 下单时会重新算一遍，不复用前端展示过的报价。
 */

export type Viewer = { sessionKey: string; openId?: string | null };

export type ActiveDiscount = {
  id: string;
  percent: number;
  expiresAt: Date;
  kind: "SHARE" | "TIMED";
};

export type Quote = {
  /** 实付金额，单位分 */
  amount: number;
  /** 未打折时的售价 */
  listAmount: number;
  /** 划线价，用于展示 */
  originalAmount?: number;
  discount: ActiveDiscount | null;
};

/** 找出这次作答在当前会话下仍然有效的折扣券。 */
export async function findActiveDiscount(
  attemptId: string,
  viewer: Viewer,
): Promise<ActiveDiscount | null> {
  const row = await prisma.discount.findFirst({
    where: {
      attemptId,
      sessionKey: viewer.sessionKey,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, percent: true, expiresAt: true, kind: true },
    orderBy: { createdAt: "desc" },
  });
  return row as ActiveDiscount | null;
}

/**
 * 算价。这是唯一的定价入口，展示和下单都走它，
 * 保证用户看到的价格和实际扣的钱是同一个来源。
 */
export async function quote(
  attemptId: string,
  viewer: Viewer,
  paywall: Paywall,
): Promise<Quote> {
  const listAmount = paywall.price.amount;
  const discount = await findActiveDiscount(attemptId, viewer);

  if (!discount) {
    return { amount: listAmount, listAmount, originalAmount: paywall.price.originalAmount, discount: null };
  }

  // 折后按原价的 percent% 收，向上取整到分，避免出现 0 元订单
  const amount = Math.max(1, Math.round((listAmount * discount.percent) / 100));
  return { amount, listAmount, originalAmount: paywall.price.originalAmount, discount };
}

export type ClaimResult =
  | { ok: true; discount: ActiveDiscount }
  | { ok: false; reason: "disabled" | "already" | "not-owner" };

/**
 * 领取折扣券。
 *
 * 有效期从领取那一刻算起，由服务端写死到数据库，客户端无法延长。
 * 同一次作答同一个会话只发一张，靠数据库唯一索引兜底，
 * 反复点分享不会刷新有效期。
 */
export async function claimDiscount(
  attemptId: string,
  viewer: Viewer,
  paywall: Paywall,
): Promise<ClaimResult> {
  const config = paywall.discount;
  if (!config) return { ok: false, reason: "disabled" };

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, deletedAt: null },
    select: { sessionKey: true },
  });
  if (!attempt) return { ok: false, reason: "not-owner" };
  // 只有本人能给自己的结果领券，别人拿到链接领不了
  if (attempt.sessionKey !== viewer.sessionKey) return { ok: false, reason: "not-owner" };

  const existing = await findActiveDiscount(attemptId, viewer);
  if (existing) return { ok: true, discount: existing };

  const expiresAt = new Date(Date.now() + config.windowHours * 3600 * 1000);
  const kind = config.trigger === "share" ? "SHARE" : "TIMED";

  try {
    const row = await prisma.discount.create({
      data: {
        attemptId,
        sessionKey: viewer.sessionKey,
        openId: viewer.openId ?? undefined,
        kind,
        percent: config.percent,
        expiresAt,
      },
      select: { id: true, percent: true, expiresAt: true, kind: true },
    });
    return { ok: true, discount: row as ActiveDiscount };
  } catch {
    // 唯一索引冲突说明已经有一张，可能已过期或已核销
    const again = await findActiveDiscount(attemptId, viewer);
    if (again) return { ok: true, discount: again };
    return { ok: false, reason: "already" };
  }
}

/** 订单支付成功后核销折扣券。重复调用不会出问题。 */
export async function consumeDiscount(discountId: string, orderId: string): Promise<void> {
  try {
    await prisma.discount.updateMany({
      where: { id: discountId, usedAt: null },
      data: { usedAt: new Date(), usedByOrderId: orderId },
    });
  } catch (err) {
    // 核销失败不影响权益发放，权益已经由订单状态决定
    console.error(`[pay] 折扣券核销失败 discount=${discountId} order=${orderId}`, err);
  }
}
