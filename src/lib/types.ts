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

/**
 * 公开解读的一节。
 *
 * 这是免费字段：写这个类型的共性，用日常说法，第三人称。
 * 付费报告写的是「你」——针对本次作答的具体位置和可执行动作，两边不重叠。
 * 章节结构由内容包决定，页面按顺序渲染，新增一节不需要改组件。
 */
export type GuideChapter = {
  /** 锚点，也是目录里的顺序标识 */
  id: string;
  /** 目录上的短标签 */
  nav: string;
  /** content/illustrations.json 里的场景名 */
  scene: string;
  title: string;
  /** 标题下的一句话，替用户先说出这一节的结论 */
  lead: string;
  paragraphs: string[];
  /** 两栏对照，用于「长处与难处」这类小节 */
  goodTitle?: string;
  good?: string[];
  hardTitle?: string;
  hard?: string[];
  /** 一组并列的短句，用于「常见的去处」这类小节 */
  pointsTitle?: string;
  points?: string[];
  /**
   * 版式覆盖。不写时页面按这一节有什么内容自己选：
   * 有 good/hard 走对照版式，有 points 走瓦片版式，其余按序号在横幅与图文左右之间轮换。
   * 只有需要打断轮换（比如结尾那节不想再出现插画）时才显式声明。
   */
  layout?: GuideLayout;
};

/** 章节版式。banner 是头图铺满，split 是图文左右，plain 不出图。 */
export type GuideLayout = "banner" | "split" | "split-reverse" | "plain";

export type ResultDoc = {
  code: string;
  name: string;
  label: string;
  keywords: string[];
  /**
   * 人生信条。一句短话，写在分享卡上最显眼的位置。
   *
   * 它和 label 的分工：label 是别人怎么看这一类人，creed 是这一类人自己怎么说。
   * 免费字段，会出现在公开分享卡上。
   */
  creed: string;
  /**
   * 口语标签。四到六条，每条不超过 12 字。
   *
   * keywords 是三个词，给检索和 meta 用；tags 是句子，给人看的，
   * 也是分享卡底部那一格和类型页关键词瓦片的内容。免费字段。
   */
  tags: string[];
  /** 免费的通俗解读，类型页正文 */
  guide: GuideChapter[];
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
