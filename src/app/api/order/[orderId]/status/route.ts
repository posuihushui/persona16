import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncOrderStatus } from "@/lib/pay/reconcile";
import { readSessionKey } from "@/lib/session";
import { readOpenId } from "@/lib/wechat/identity";

export const runtime = "nodejs";

/**
 * 订单状态查询，供前端支付后轮询。
 *
 * 必须鉴权：订单状态里带找回码，不能让任何人凭订单号查到。
 * 请求方需要持有下单时的 sessionKey，或者绑定同一个 openId。
 */
export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { sessionKey: true, openId: true },
  });
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

  const sessionKey = await readSessionKey();
  const openId = await readOpenId();
  const owns =
    (sessionKey !== null && sessionKey === order.sessionKey) ||
    (openId !== null && order.openId !== null && openId === order.openId);
  if (!owns) return NextResponse.json({ error: "无权查看该订单" }, { status: 403 });

  const view = await syncOrderStatus(orderId);
  if (!view) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

  return NextResponse.json(view);
}
