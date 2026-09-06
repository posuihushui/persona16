import { EVENTS, track } from "../analytics";
import { prisma } from "../db";
import { consumeDiscount } from "../pricing";
import { getProvider } from "./index";

/**
 * 订单状态对账。
 *
 * 微信的支付回调会丢，也会迟到。用户在页面上等不了回调重试的间隔，
 * 所以前端支付完成后要主动查单，以支付平台的结果为准把本地状态补上。
 *
 * 这不是可选优化。回调是唯一的权益发放依据没错，但「回调没来」和
 * 「用户没付钱」是两回事，只靠回调会让一部分付了钱的用户看不到报告。
 */

export type OrderStatusView = {
  orderId: string;
  status: "PENDING" | "PAID" | "FAILED" | "CLOSED" | "REFUNDED";
  paid: boolean;
  retrieveCode: string | null;
};

/**
 * 读取订单状态，必要时向支付平台查单并落库。
 * 只在本地仍是 PENDING 时才查远端，已经终态的订单不重复查。
 */
export async function syncOrderStatus(orderId: string): Promise<OrderStatusView | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      amount: true,
      attemptId: true,
      sessionKey: true,
      provider: true,
      discountId: true,
      retrieveCode: true,
    },
  });
  if (!order) return null;

  const view = (status: OrderStatusView["status"]): OrderStatusView => ({
    orderId: order.id,
    status,
    paid: status === "PAID",
    // 只有已支付才把找回码交出去
    retrieveCode: status === "PAID" ? order.retrieveCode : null,
  });

  if (order.status !== "PENDING") return view(order.status);

  let remote;
  try {
    remote = await getProvider(order.provider).query(order.id);
  } catch (err) {
    // 查单失败不能把订单判死，保持 PENDING 让前端继续轮询或等回调
    console.error(`[pay] 查单失败 order=${order.id}`, err);
    return view("PENDING");
  }

  if (remote.state === "PENDING") return view("PENDING");

  // 金额核对，防止查到的不是同一笔
  if (remote.state === "PAID" && remote.amount !== undefined && remote.amount !== order.amount) {
    console.error(
      `[pay] 查单金额不符 order=${order.id} 期望=${order.amount} 实收=${remote.amount}`,
    );
    return view("PENDING");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: remote.state,
      ...(remote.state === "PAID" ? { paidAt: new Date() } : {}),
      ...(remote.tradeNo ? { providerTradeNo: remote.tradeNo } : {}),
    },
  });

  if (remote.state === "PAID") {
    if (order.discountId) await consumeDiscount(order.discountId, order.id);
    await track(order.sessionKey, EVENTS.orderPaid, {
      attemptId: order.attemptId,
      props: { orderId: order.id, provider: order.provider, source: "query" },
    });
  }

  return view(remote.state);
}
