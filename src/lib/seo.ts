import type { FaqItem, ResultDoc, TestPack } from "./types";

/**
 * 站点级 SEO 常量与结构化数据构造。
 *
 * 结构化数据同时服务两类读者：搜索引擎的富结果，和 AI 回答引擎的内容理解。
 * 这两类读者都不执行 JavaScript，所以所有内容必须在服务端渲染进 HTML。
 */

export const SITE_NAME = "Persona16";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function absolute(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** 站点主体信息，来自法务环境变量，未配置时退化成中性描述。 */
export function publisher() {
  const name = process.env.LEGAL_ENTITY_NAME;
  return {
    "@type": "Organization",
    name: name || SITE_NAME,
    url: siteUrl(),
    ...(process.env.LEGAL_CONTACT_EMAIL
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: process.env.LEGAL_CONTACT_EMAIL,
          },
        }
      : {}),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl(),
    inLanguage: "zh-CN",
    publisher: publisher(),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

export function faqSchema(faq: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** 测试本身。用 Quiz 而不是 Product，因为免费部分才是主体。 */
export function quizSchema(pack: TestPack) {
  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: pack.meta.name,
    url: absolute(`/t/${pack.meta.slug}`),
    description: pack.meta.seo.description,
    inLanguage: "zh-CN",
    educationalLevel: "beginner",
    numberOfQuestions: pack.meta.questionCount,
    timeRequired: `PT${pack.meta.estimatedMinutes}M`,
    isAccessibleForFree: true,
    datePublished: pack.meta.publishedAt,
    dateModified: pack.meta.updatedAt,
    publisher: publisher(),
    about: {
      "@type": "Thing",
      name: "人格类型",
      description: pack.meta.about.split("\n\n")[0],
    },
  };
}

/**
 * 单个类型的解读页。用 Article，正文是我们自己写的原创描述。
 *
 * description 必须由调用方传入免费预览，不能在这里切正文：
 * 结构化数据也是公开内容，从这里泄漏付费正文和写在页面上没有区别。
 */
export function typeArticleSchema(pack: TestPack, doc: ResultDoc, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${doc.code} ${doc.name}：${doc.label}`,
    url: absolute(`/t/${pack.meta.slug}/type/${doc.code}`),
    description,
    articleSection: pack.meta.name,
    keywords: [doc.code, doc.name, ...doc.keywords, pack.meta.name].join(","),
    inLanguage: "zh-CN",
    datePublished: pack.meta.publishedAt,
    dateModified: pack.meta.updatedAt,
    author: publisher(),
    publisher: publisher(),
    // 页面部分付费。把付费区块显式标出来是 Google 对付费内容的要求，
    // 声明成全免费会被判作 cloaking。
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ".locked",
    },
  };
}

/** 类型索引页的列表数据，帮助抓取器一次看到全部 16 个类型。 */
export function typeListSchema(pack: TestPack, codes: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${pack.meta.name}的 ${codes.length} 种类型`,
    numberOfItems: codes.length,
    itemListElement: codes.map((code, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${code} ${pack.results[code]?.name ?? ""}`.trim(),
      url: absolute(`/t/${pack.meta.slug}/type/${code}`),
    })),
  };
}
