import { prisma } from "./db";

/**
 * 权益判定。
 *
 * 免费部分对任何持链接的人可见，这是产品的传播机制（agents.md 原则 1），
 * 不做「分享才能看」的门槛。
 *
 * 付费部分必须服务端鉴权，满足以下任一条件才放行：
 *   1. 请求方持有该 Attempt 的 sessionKey，且该 Attempt 上有已支付订单
 *   2. 请求方的 openId 在该 Attempt 上有已支付订单（跨设备找回）
 *   3. 请求方提供了该订单的找回码
 *
 * 前端不做隐藏式伪装，未付费用户的 HTML 里不会出现付费内容。
 */

export type Viewer = {
  sessionKey: string | null;
  openId?: string | null;
  retrieveCode?: string | null;
};

export async function hasPaidAccess(attemptId: string, viewer: Viewer): Promise<boolean> {
  const conditions: Array<Record<string, unknown>> = [];
  if (viewer.sessionKey) conditions.push({ sessionKey: viewer.sessionKey });
  if (viewer.openId) conditions.push({ openId: viewer.openId });
  if (viewer.retrieveCode) conditions.push({ retrieveCode: viewer.retrieveCode });
  if (conditions.length === 0) return false;

  const order = await prisma.order.findFirst({
    where: { attemptId, status: "PAID", OR: conditions },
    select: { id: true },
  });
  return order !== null;
}

/** 找回码换 Attempt，用于换设备后找回报告。 */
export async function findAttemptByRetrieveCode(code: string) {
  const order = await prisma.order.findUnique({
    where: { retrieveCode: code.trim().toUpperCase() },
    select: { attemptId: true, status: true },
  });
  if (!order || order.status !== "PAID") return null;
  return order.attemptId;
}
