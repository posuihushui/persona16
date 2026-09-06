import type {
  NotifyResult,
  PayContext,
  PayProvider,
  PrepayResult,
  QueryResult,
  RefundContext,
  RefundResult,
} from "./provider";

/**
 * 本地开发用的支付实现。它不做任何真实扣款，直接把用户带到一个确认页。
 * 生产环境禁止使用，scripts/check-prod-env.mjs 会拦截 PAY_PROVIDER=mock。
 *
 * 查单实现成「以本地数据库为准」，由调用方决定怎么解释，
 * 这里只保证接口形状与真实 provider 一致，让上层逻辑可以在本地跑通。
 */
export class MockPayProvider implements PayProvider {
  readonly id = "mock";

  private assertNotProduction(): void {
    if (process.env.NODE_ENV === "production") {
      throw new Error("生产环境不允许使用 mock 支付");
    }
  }

  async prepay(ctx: PayContext): Promise<PrepayResult> {
    this.assertNotProduction();
    const url = `/api/pay/notify/mock?orderId=${encodeURIComponent(ctx.orderId)}&redirect=${encodeURIComponent(ctx.returnUrl)}`;
    return { kind: "mock", url };
  }

  async parseNotify(req: Request): Promise<NotifyResult> {
    this.assertNotProduction();
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) throw new Error("mock 回调缺少 orderId");
    return {
      eventId: `mock-${orderId}`,
      orderId,
      tradeNo: `MOCK${Date.now()}`,
      paid: true,
      amount: 0,
      raw: { mock: true },
    };
  }

  ack(ok: boolean, message?: string): Response {
    return new Response(JSON.stringify({ ok, message }), {
      status: ok ? 200 : 400,
      headers: { "content-type": "application/json" },
    });
  }

  /** mock 没有远端状态，返回 PENDING，让调用方以本地订单状态为准。 */
  async query(orderId: string): Promise<QueryResult> {
    this.assertNotProduction();
    return { orderId, state: "PENDING", raw: { mock: true } };
  }

  async close(): Promise<void> {
    this.assertNotProduction();
  }

  async refund(ctx: RefundContext): Promise<RefundResult> {
    this.assertNotProduction();
    return {
      refundId: ctx.refundId,
      providerRefundId: `MOCKREFUND${Date.now()}`,
      status: "SUCCESS",
      raw: { mock: true },
    };
  }
}
