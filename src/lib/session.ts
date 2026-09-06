import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * 匿名会话。完成测试不需要注册，sessionKey 是浏览器级标识，
 * 用于把作答和订单归到同一个人。Cookie 是 HttpOnly 且签名的，
 * 防止用户直接改 Cookie 冒领别人的付费报告。
 */

const COOKIE_NAME = "p16_sk";
const MAX_AGE = 60 * 60 * 24 * 365; // 一年

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET 未配置或过短，生产环境不允许启动");
    }
    return "dev-only-insecure-secret";
  }
  return s;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function packSigned(value: string): string {
  return `${value}.${sign(value)}`;
}

export function unpackSigned(raw: string): string | null {
  const idx = raw.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = raw.slice(0, idx);
  const mac = raw.slice(idx + 1);
  const expected = sign(value);
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return value;
}

/** 读取当前 sessionKey，没有则返回 null。Server Component 可用。 */
export async function readSessionKey(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return unpackSigned(raw);
}

/**
 * 读取或创建 sessionKey。只能在 Route Handler 或 Server Action 里调用，
 * Server Component 不允许写 Cookie。
 */
export async function ensureSessionKey(): Promise<string> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const existing = raw ? unpackSigned(raw) : null;
  if (existing) return existing;

  const fresh = crypto.randomUUID();
  store.set(COOKIE_NAME, packSigned(fresh), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
  return fresh;
}

/** 用户可见的找回码，去掉容易看错的字符。 */
export function generateRetrieveCode(): string {
  const alphabet = "ACDEFGHJKLMNPQRTUVWXY34679";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}
