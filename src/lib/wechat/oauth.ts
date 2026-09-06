/**
 * 微信网页授权。只用 snsapi_base 静默授权取 openid，不取用户昵称头像。
 * 见 agents.md 原则 8：匿名优先，仅在支付和跨设备找回时才需要身份。
 */

const AUTH_BASE = "https://open.weixin.qq.com/connect/oauth2/authorize";
const TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token";

export function authorizeUrl(redirectUri: string, state: string): string {
  const appId = process.env.WECHAT_APP_ID;
  if (!appId) throw new Error("WECHAT_APP_ID 未配置");
  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "snsapi_base",
    state,
  });
  return `${AUTH_BASE}?${params.toString()}#wechat_redirect`;
}

export async function exchangeCodeForOpenId(code: string): Promise<string> {
  const appId = process.env.WECHAT_APP_ID;
  const secret = process.env.WECHAT_APP_SECRET;
  if (!appId || !secret) throw new Error("微信网页授权缺少 AppID 或 AppSecret");

  const params = new URLSearchParams({
    appid: appId,
    secret,
    code,
    grant_type: "authorization_code",
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`, { cache: "no-store" });
  const data = (await res.json()) as { openid?: string; errcode?: number; errmsg?: string };
  if (!data.openid) {
    throw new Error(`微信网页授权失败: ${data.errcode} ${data.errmsg}`);
  }
  return data.openid;
}
