import { cookies } from "next/headers";
import { packSigned, unpackSigned } from "../session";

/**
 * 微信身份。只在支付和跨设备找回时需要，用 snsapi_base 静默授权取 openid，
 * 不取昵称头像（agents.md 原则 8）。
 *
 * openId 存在签名的 HttpOnly Cookie 里，用户改不了，也不会进客户端 bundle。
 */

const COOKIE_NAME = "p16_wx";
const MAX_AGE = 60 * 60 * 24 * 30; // 一个月，过期后重新静默授权即可

export async function readOpenId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return unpackSigned(raw);
}

export async function writeOpenId(openId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, packSigned(openId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** 微信网页授权是否已经具备配置条件。缺配置时不应该把用户送去一个必然失败的跳转。 */
export function canAuthorize(): boolean {
  return Boolean(process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET);
}
