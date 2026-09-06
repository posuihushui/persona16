import { MockPayProvider } from "./mock";
import type { PayProvider } from "./provider";
import { WechatPayProvider } from "./wechat";

const providers: Record<string, () => PayProvider> = {
  mock: () => new MockPayProvider(),
  wechat: () => new WechatPayProvider(),
};

export function getProvider(id?: string): PayProvider {
  const key = id ?? process.env.PAY_PROVIDER ?? "mock";
  const factory = providers[key];
  if (!factory) throw new Error(`未知的支付方式: ${key}`);
  if (key === "mock" && process.env.NODE_ENV === "production") {
    throw new Error("生产环境不允许使用 mock 支付");
  }
  return factory();
}

export * from "./provider";
