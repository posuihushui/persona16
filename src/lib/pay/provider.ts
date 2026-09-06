/**
 * 支付 provider 接口。新增支付方式只实现这个接口，不改业务代码。
 * 约定见 agents.md 原则 10：本地可以 mock，生产必须真实预下单、验签、
 * 幂等，并在回调确认后再发放权益。
 */

/** 用户当前所处的浏览器环境，决定能用哪种支付方式。 */
export type Scene = "wechat" | "douyin" | "browser";

export type PayContext = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  notifyUrl: string;
  returnUrl: string;
  scene: Scene;
  openId?: string;
  clientIp: string;
};

export type PrepayResult =
  /** 微信内 JSAPI，前端用 WeixinJSBridge 调起 */
  | { kind: "jsapi"; params: Record<string, string> }
  /** 微信外浏览器 H5 支付，直接跳转 */
  | { kind: "redirect"; url: string }
  /** 本地开发用，跳到一个确认页直接标记已支付 */
  | { kind: "mock"; url: string }
  /** 微信内尚未拿到 openid，前端跳去静默授权后重试 */
  | { kind: "auth"; url: string }
  /** 当前环境无法完成支付，前端要显示明确引导而不是静默失败 */
  | { kind: "unsupported"; reason: string; guidance: string };

export type NotifyResult = {
  /** 支付平台的事件唯一标识，用于回调幂等 */
  eventId: string;
  orderId: string;
  tradeNo: string;
  paid: boolean;
  amount: number;
  raw: unknown;
};

/** 主动查单的结果。回调可能丢，查单是兜底，不是可选功能。 */
export type QueryResult = {
  orderId: string;
  /** 支付平台的统一状态 */
  state: "PENDING" | "PAID" | "FAILED" | "CLOSED" | "REFUNDED";
  tradeNo?: string;
  amount?: number;
  raw: unknown;
};

export type RefundContext = {
  orderId: string;
  /** 商户侧退款单号，必须幂等 */
  refundId: string;
  /** 本次退款金额，单位分 */
  refundAmount: number;
  /** 原订单总金额，单位分 */
  totalAmount: number;
  currency: string;
  reason: string;
  notifyUrl?: string;
};

export type RefundResult = {
  refundId: string;
  providerRefundId: string;
  status: string;
  raw: unknown;
};

export interface PayProvider {
  readonly id: string;
  prepay(ctx: PayContext): Promise<PrepayResult>;
  /** 解析并验签回调。验签失败必须抛错，绝不能当成已支付。 */
  parseNotify(req: Request): Promise<NotifyResult>;
  /** 回执，告诉支付平台是否已受理。 */
  ack(ok: boolean, message?: string): Response;
  /**
   * 主动查单。用户支付成功但回调没到达时，靠这个把状态补上。
   * 微信的回调重试有间隔，用户在页面上等不了那么久。
   */
  query(orderId: string): Promise<QueryResult>;
  /** 关闭未支付订单，避免用户在旧订单上重复支付。 */
  close(orderId: string): Promise<void>;
  /** 退款。用户协议承诺了 7 天内可申请，这个能力必须真实可用。 */
  refund(ctx: RefundContext): Promise<RefundResult>;
}

export class PayError extends Error {}

/** 从 User-Agent 判断当前所处的浏览器环境。 */
export function detectScene(userAgent: string | null): Scene {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua.includes("micromessenger")) return "wechat";
  if (ua.includes("aweme") || ua.includes("bytedance") || ua.includes("toutiao")) {
    return "douyin";
  }
  return "browser";
}
