import crypto from "node:crypto";
import {
  PayError,
  type NotifyResult,
  type PayContext,
  type PayProvider,
  type PrepayResult,
  type QueryResult,
  type RefundContext,
  type RefundResult,
} from "./provider";

/**
 * 微信支付 v3。
 *
 * 微信内走 JSAPI，微信外浏览器走 H5，抖音内置浏览器无法唤起时返回 unsupported
 * 由前端显式引导，不静默失败（agents.md 原则 10）。
 *
 * 接入步骤、密钥准备、联调和排错见 docs/operations/wechat-pay.md。
 * 平台公钥按 Wechatpay-Serial 多序列号映射，轮换流程见
 * docs/operations/wechat-pay-key-rotation.md。
 *
 * 密钥只从环境变量读，不进客户端 bundle。
 */

const API_BASE = "https://api.mch.weixin.qq.com";

/** 回调时间戳允许的最大偏差，超过视为重放。微信官方建议 5 分钟。 */
const NOTIFY_MAX_SKEW_SECONDS = 300;

type Env = {
  appId: string;
  mchId: string;
  apiV3Key: string;
  mchSerialNo: string;
  privateKey: string;
  platformKeys: Map<string, string>;
};

function loadEnv(): Env {
  const need = (k: string): string => {
    const v = process.env[k];
    if (!v) throw new PayError(`微信支付缺少环境变量 ${k}`);
    return v;
  };

  // 轮换期新旧序列号同时存在，格式 serial1=PEM;;serial2=PEM
  const platformKeys = new Map<string, string>();
  for (const pair of (process.env.WECHAT_PLATFORM_PUBLIC_KEYS ?? "").split(";;")) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    platformKeys.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim().replace(/\\n/g, "\n"));
  }

  const apiV3Key = need("WECHAT_API_V3_KEY");
  if (apiV3Key.length !== 32) {
    throw new PayError("WECHAT_API_V3_KEY 必须是 32 位，请核对商户平台设置的 APIv3 密钥");
  }

  return {
    appId: need("WECHAT_APP_ID"),
    mchId: need("WECHAT_MCH_ID"),
    apiV3Key,
    mchSerialNo: need("WECHAT_MCH_SERIAL_NO"),
    privateKey: need("WECHAT_MCH_PRIVATE_KEY").replace(/\\n/g, "\n"),
    platformKeys,
  };
}

function rsaSign(message: string, privateKey: string): string {
  return crypto.createSign("RSA-SHA256").update(message).sign(privateKey, "base64");
}

/**
 * v3 的 Authorization 头。签名串是固定的五行：
 * 方法、含 query 的路径、时间戳、随机串、请求体，每行后面都有换行。
 * GET 没有请求体，那一行留空但换行必须在。
 */
function authorization(env: Env, method: string, urlPath: string, body: string): string {
  const nonce = crypto.randomBytes(16).toString("hex").toUpperCase();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = rsaSign(message, env.privateKey);
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${env.mchId}",` +
    `nonce_str="${nonce}",signature="${signature}",` +
    `timestamp="${timestamp}",serial_no="${env.mchSerialNo}"`
  );
}

type WechatErrorBody = { code?: string; message?: string };

async function request<T>(
  env: Env,
  method: "GET" | "POST",
  urlPath: string,
  payload?: unknown,
): Promise<T> {
  const body = payload === undefined ? "" : JSON.stringify(payload);

  const res = await fetch(`${API_BASE}${urlPath}`, {
    method,
    headers: {
      accept: "application/json",
      "user-agent": "persona16",
      authorization: authorization(env, method, urlPath, body),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body } : {}),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text) as WechatErrorBody;
      detail = `${parsed.code ?? res.status} ${parsed.message ?? ""}`.trim();
    } catch {
      // 保持原始文本
    }
    throw new PayError(`微信支付接口失败 ${method} ${urlPath}: ${detail}`);
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

/** AES-256-GCM 解密回调 resource。 */
function decryptResource(
  apiV3Key: string,
  resource: { ciphertext: string; nonce: string; associated_data?: string },
): unknown {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(apiV3Key, "utf8"),
    Buffer.from(resource.nonce, "utf8"),
  );
  decipher.setAAD(Buffer.from(resource.associated_data ?? "", "utf8"));
  const data = Buffer.from(resource.ciphertext, "base64");
  const tag = data.subarray(data.length - 16);
  const body = data.subarray(0, data.length - 16);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  return JSON.parse(plain);
}

/** 微信的 trade_state 到我们统一状态的映射。 */
function mapTradeState(state: string): QueryResult["state"] {
  switch (state) {
    case "SUCCESS":
      return "PAID";
    case "REFUND":
      return "REFUNDED";
    case "NOTPAY":
    case "USERPAYING":
      return "PENDING";
    case "CLOSED":
    case "REVOKED":
      return "CLOSED";
    case "PAYERROR":
      return "FAILED";
    default:
      return "PENDING";
  }
}

type TransactionBody = {
  out_trade_no: string;
  transaction_id?: string;
  trade_state: string;
  amount?: { total?: number; payer_total?: number };
};

export class WechatPayProvider implements PayProvider {
  readonly id = "wechat";

  async prepay(ctx: PayContext): Promise<PrepayResult> {
    if (ctx.scene === "douyin") {
      return {
        kind: "unsupported",
        reason: "抖音内置浏览器无法唤起微信支付",
        guidance: "点右上角选择在浏览器打开，或复制链接到微信中打开后继续支付。",
      };
    }

    const env = loadEnv();
    const base = {
      appid: env.appId,
      mchid: env.mchId,
      description: ctx.description,
      out_trade_no: ctx.orderId,
      notify_url: ctx.notifyUrl,
      amount: { total: ctx.amount, currency: ctx.currency },
    };

    if (ctx.scene === "wechat") {
      if (!ctx.openId) {
        throw new PayError("微信内支付缺少 openId，需要先完成网页授权");
      }
      const data = await request<{ prepay_id: string }>(
        env,
        "POST",
        "/v3/pay/transactions/jsapi",
        { ...base, payer: { openid: ctx.openId } },
      );

      // 调起支付的参数要用商户私钥再签一次，签名串是四行
      const timeStamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = crypto.randomBytes(16).toString("hex").toUpperCase();
      const packageStr = `prepay_id=${data.prepay_id}`;
      const paySign = rsaSign(
        `${env.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`,
        env.privateKey,
      );

      return {
        kind: "jsapi",
        params: {
          appId: env.appId,
          timeStamp,
          nonceStr,
          package: packageStr,
          signType: "RSA",
          paySign,
        },
      };
    }

    const data = await request<{ h5_url: string }>(env, "POST", "/v3/pay/transactions/h5", {
      ...base,
      scene_info: {
        payer_client_ip: ctx.clientIp,
        h5_info: { type: "Wap" },
      },
    });

    // redirect_url 让用户支付完自动跳回报告页，微信要求它做 URL 编码
    const url = new URL(data.h5_url);
    url.searchParams.set("redirect_url", ctx.returnUrl);
    return { kind: "redirect", url: url.toString() };
  }

  async parseNotify(req: Request): Promise<NotifyResult> {
    const env = loadEnv();
    const body = await req.text();

    const serial = req.headers.get("wechatpay-serial");
    const timestamp = req.headers.get("wechatpay-timestamp");
    const nonce = req.headers.get("wechatpay-nonce");
    const signature = req.headers.get("wechatpay-signature");
    if (!serial || !timestamp || !nonce || !signature) {
      throw new PayError("回调缺少验签所需的头部");
    }

    const skew = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(skew) || skew > NOTIFY_MAX_SKEW_SECONDS) {
      throw new PayError("回调时间戳超出允许范围");
    }

    const publicKey = env.platformKeys.get(serial);
    if (!publicKey) {
      throw new PayError(
        `未配置 Wechatpay-Serial=${serial} 对应的平台公钥。` +
          `已配置的序列号：${[...env.platformKeys.keys()].join(", ") || "无"}。` +
          "轮换期必须同时保留新旧序列号，见 docs/operations/wechat-pay-key-rotation.md",
      );
    }

    const ok = crypto
      .createVerify("RSA-SHA256")
      .update(`${timestamp}\n${nonce}\n${body}\n`)
      .verify(publicKey, signature, "base64");
    if (!ok) throw new PayError("回调验签失败");

    const envelope = JSON.parse(body) as {
      id: string;
      event_type: string;
      resource: { ciphertext: string; nonce: string; associated_data?: string };
    };

    const decrypted = decryptResource(env.apiV3Key, envelope.resource) as TransactionBody;

    return {
      eventId: envelope.id,
      orderId: decrypted.out_trade_no,
      tradeNo: decrypted.transaction_id ?? "",
      paid:
        envelope.event_type === "TRANSACTION.SUCCESS" && decrypted.trade_state === "SUCCESS",
      amount: decrypted.amount?.total ?? 0,
      raw: decrypted,
    };
  }

  ack(ok: boolean, message?: string): Response {
    if (ok) return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ code: "FAIL", message: message ?? "处理失败" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  async query(orderId: string): Promise<QueryResult> {
    const env = loadEnv();
    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(orderId)}?mchid=${env.mchId}`;
    const data = await request<TransactionBody>(env, "GET", path);

    return {
      orderId: data.out_trade_no,
      state: mapTradeState(data.trade_state),
      tradeNo: data.transaction_id,
      amount: data.amount?.total,
      raw: data,
    };
  }

  async close(orderId: string): Promise<void> {
    const env = loadEnv();
    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(orderId)}/close`;
    await request(env, "POST", path, { mchid: env.mchId });
  }

  async refund(ctx: RefundContext): Promise<RefundResult> {
    const env = loadEnv();
    const data = await request<{ refund_id: string; status: string }>(
      env,
      "POST",
      "/v3/refund/domestic/refunds",
      {
        out_trade_no: ctx.orderId,
        out_refund_no: ctx.refundId,
        reason: ctx.reason,
        ...(ctx.notifyUrl ? { notify_url: ctx.notifyUrl } : {}),
        amount: {
          refund: ctx.refundAmount,
          total: ctx.totalAmount,
          currency: ctx.currency,
        },
      },
    );

    return {
      refundId: ctx.refundId,
      providerRefundId: data.refund_id,
      status: data.status,
      raw: data,
    };
  }
}
