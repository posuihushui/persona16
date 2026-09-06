import type { MetadataRoute } from "next";
import { absolute } from "@/lib/seo";

/**
 * 抓取策略。
 *
 * 允许：首页、测试介绍页、16 个类型解读页、法务页、分享卡图、机器可读接口。
 * 禁止：`/r/*` 用户个人结果页与报告页、`/retrieve` 找回页、除 `/api/og` 外的接口。
 *
 * AI 抓取器按名单显式放行。本站的公开内容是自己写的原创描述，
 * 被 AI 回答引擎引用是想要的结果，所以不做拦截。
 * 用户的个人结果页是另一回事，那属于个人数据，对所有抓取器一律禁止。
 */

const DISALLOW = ["/r/", "/retrieve", "/api/"];
const ALLOW = ["/", "/api/og"];

/** AI 回答引擎与训练抓取器。 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "CCBot",
  "cohere-ai",
  "Amazonbot",
  "Bytespider",
  "TikTokSpider",
];

/** 中文搜索引擎，国内流量的主要来源。 */
const CN_SEARCH = ["Baiduspider", "Sogou web spider", "360Spider", "YisouSpider", "PetalBot"];

export default function robots(): MetadataRoute.Robots {
  const shared = { allow: ALLOW, disallow: DISALLOW };

  return {
    rules: [
      { userAgent: "*", ...shared },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, ...shared })),
      ...CN_SEARCH.map((userAgent) => ({ userAgent, ...shared })),
    ],
    sitemap: absolute("/sitemap.xml"),
    host: absolute("/"),
  };
}
