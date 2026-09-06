export type ScaleOption = { value: number; label: string };

export type Question = {
  id: string;
  text: string;
  dimension: string;
  pole: string;
  weight: number;
};

export type FaqItem = { q: string; a: string };

export type TestMeta = {
  slug: string;
  version: string;
  name: string;
  tagline: string;
  description: string;
  /** 理论背景长文，落地页正文，供搜索引擎和 AI 抓取 */
  about: string;
  questionCount: number;
  estimatedMinutes: number;
  theme: { accent: string };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    /** 同时渲染成页面 FAQ 区块和 FAQPage 结构化数据 */
    faq: FaqItem[];
  };
  disclaimer: string;
  status: "draft" | "published";
  publishedAt: string;
  /** sitemap 的 lastmod */
  updatedAt: string;
};

export type Questions = {
  slug: string;
  version: string;
  scale: { id: string; options: ScaleOption[] };
  questions: Question[];
};

export type Pole = { name: string; summary: string };

export type Dimension = {
  id: string;
  name: string;
  positivePole: string;
  tieBreak: string;
  poles: Record<string, Pole>;
};

export type Band = { id: string; maxPercent: number; name: string };

export type Scoring = {
  slug: string;
  version: string;
  mode: "dichotomy" | "bands" | "profile";
  dimensions: Dimension[];
  codeOrder?: string[];
  bands?: Band[];
  bandSource?: string;
};

/** 折扣触发方式。share 需要用户主动分享，timed 是纯限时促销，不绑定任何行为。 */
export type DiscountTrigger = "share" | "timed";

export type DiscountConfig = {
  /** 折扣后按原价的百分之多少收，60 表示六折 */
  percent: number;
  /** 有效期小时数 */
  windowHours: number;
  trigger: DiscountTrigger;
};

/** 付费墙上展示的锁定条目，只给标题和一句钩子，不泄漏正文 */
export type LockedItem = { key: string; title: string; hint: string };

export type Paywall = {
  slug: string;
  free: string[];
  /** 免费预览：从某个付费字段截出开头若干字 */
  teaser?: { field: string; chars: number };
  paid: string[];
  price: { amount: number; originalAmount?: number; currency: string };
  discount?: DiscountConfig;
  productName: string;
  locked: LockedItem[];
  promise: string[];
  refundNote: string;
};

export type BlindSpot = { point: string; action: string };

export type ResultDoc = {
  code: string;
  name: string;
  label: string;
  keywords: string[];
  core: string;
  atBest: string;
  atWorst: string;
  cognition: string;
  strengths: string[];
  blindSpots: BlindSpot[];
  career: { fits: string[]; drains: string[]; roles: string[] };
  relationship: { inLove: string; friction: string };
  withOthers: { code: string; note: string }[];
  growth: string[];
};

export type TestPack = {
  meta: TestMeta;
  questions: Questions;
  scoring: Scoring;
  paywall: Paywall;
  results: Record<string, ResultDoc>;
};

/** 单个维度的得分展开，用于结果页渲染。 */
export type DimensionScore = {
  id: string;
  name: string;
  /** 加权原始分，正数偏向 positivePole。 */
  raw: number;
  /** 该维度理论最大绝对值。 */
  max: number;
  /** 0-100，越大越偏向 positivePole。 */
  percent: number;
  /** 命中的极。 */
  pole: string;
  poleName: string;
  poleSummary: string;
  /** 该极的倾向强度，50-100，用于「偏好明显 / 两边都有」的表述。 */
  strength: number;
};

export type ScoreResult = {
  code: string;
  dimensions: DimensionScore[];
};
