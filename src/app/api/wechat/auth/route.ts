import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { canAuthorize, writeOpenId } from "@/lib/wechat/identity";
import { authorizeUrl, exchangeCodeForOpenId } from "@/lib/wechat/oauth";

export const runtime = "nodejs";

/**
 * 微信网页授权。同一个入口处理发起和回调：
 *   没有 code   → 跳到微信授权页
 *   带着 code   → 换 openid，写 Cookie，跳回业务页面
 *
 * 用 snsapi_base 静默授权，用户无感知，只拿 openid。
 * state 里放业务跳转目标，回来时校验必须是站内路径，防开放重定向。
 */

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL 未配置");
  return url.replace(/\/$/, "");
}

/** 只接受站内绝对路径，不接受协议开头或协议相对地址。 */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!canAuthorize()) {
    return NextResponse.json(
      { error: "微信网页授权未配置", detail: "缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET" },
      { status: 503 },
    );
  }

  if (!code) {
    const next = safeNext(url.searchParams.get("next"));
    // state 同时承担跳转目标和一次性随机串，微信会原样带回
    const state = `${crypto.randomBytes(6).toString("hex")}:${Buffer.from(next).toString("base64url")}`;
    const redirectUri = `${siteUrl()}/api/wechat/auth`;
    return NextResponse.redirect(authorizeUrl(redirectUri, state), 302);
  }

  const state = url.searchParams.get("state") ?? "";
  const encoded = state.split(":")[1] ?? "";
  let next = "/";
  try {
    next = safeNext(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    next = "/";
  }

  try {
    const openId = await exchangeCodeForOpenId(code);
    await writeOpenId(openId);
  } catch (err) {
    console.error("[wechat] 网页授权失败", err);
    return NextResponse.redirect(new URL(`${next}?wxauth=failed`, siteUrl()), 302);
  }

  return NextResponse.redirect(new URL(next, siteUrl()), 302);
}
