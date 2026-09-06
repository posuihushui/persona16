import fs from "node:fs";
import path from "node:path";
import type {
  Paywall,
  Questions,
  ResultDoc,
  Scoring,
  TestMeta,
  TestPack,
} from "./types";

/**
 * 内容包加载器。测试内容全部来自 content/tests/<slug>/，
 * 组件里不允许出现测试文案。内容包一经发布即冻结，历史作答按其记录的
 * version 渲染，不随最新内容包变化。
 */

const CONTENT_ROOT = path.join(process.cwd(), "content", "tests");

const cache = new Map<string, TestPack>();

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function listTestSlugs(): string[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  return fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function loadPack(slug: string): TestPack {
  const cached = cache.get(slug);
  if (cached) return cached;

  const dir = path.join(CONTENT_ROOT, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(`内容包不存在: ${slug}`);
  }

  const meta = readJson<TestMeta>(path.join(dir, "meta.json"));
  const questions = readJson<Questions>(path.join(dir, "questions.json"));
  const scoring = readJson<Scoring>(path.join(dir, "scoring.json"));
  const paywall = readJson<Paywall>(path.join(dir, "paywall.json"));

  if (meta.version !== questions.version || meta.version !== scoring.version) {
    throw new Error(
      `内容包 ${slug} 版本号不一致: meta=${meta.version} questions=${questions.version} scoring=${scoring.version}`,
    );
  }

  const resultsDir = path.join(dir, "results");
  const results: Record<string, ResultDoc> = {};
  if (fs.existsSync(resultsDir)) {
    for (const file of fs.readdirSync(resultsDir)) {
      if (!file.endsWith(".json")) continue;
      const doc = readJson<ResultDoc>(path.join(resultsDir, file));
      results[doc.code] = doc;
    }
  }

  const pack: TestPack = { meta, questions, scoring, paywall, results };
  cache.set(slug, pack);
  return pack;
}

export function listPublishedPacks(): TestPack[] {
  return listTestSlugs()
    .map((slug) => {
      try {
        return loadPack(slug);
      } catch {
        return null;
      }
    })
    .filter((p): p is TestPack => p !== null && p.meta.status === "published");
}

export type FreeView = Partial<ResultDoc> & {
  /** 付费正文的开头若干字，末尾不加省略号，由界面负责渐隐 */
  teaser?: string;
  /** 被截断的正文还剩多少字，用来告诉用户「还有 N 字」 */
  teaserRemaining?: number;
};

/**
 * 只返回免费字段和一段预览。
 *
 * 付费正文绝不能整段出现在这个返回里：未付费用户的 HTML 里不允许存在付费内容，
 * 前端不做隐藏式伪装（agents.md 数据与权限约定）。
 */
export function freeView(doc: ResultDoc, paywall: Paywall): FreeView {
  const source = doc as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { code: doc.code };

  for (const key of paywall.free) {
    out[key] = source[key];
  }

  if (paywall.teaser) {
    const full = source[paywall.teaser.field];
    if (typeof full === "string") {
      // 尽量断在标点上，硬截会把句子切得很难看
      const limit = paywall.teaser.chars;
      let cut = full.slice(0, limit);
      const lastStop = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("，"), cut.lastIndexOf("；"));
      if (lastStop > limit * 0.6) cut = cut.slice(0, lastStop + 1);
      out.teaser = cut;
      out.teaserRemaining = Math.max(0, full.length - cut.length);
    }
  }

  return out as FreeView;
}

/**
 * 从类型码解出每个维度命中的极。
 * 类型落地页要展示「I 内向 · N 直觉 · F 情感 · P 感知」这样的拆解，
 * 这份数据不依赖任何一次具体作答，是类型本身的属性。
 */
export type CodePole = {
  dimensionId: string;
  dimensionName: string;
  poleId: string;
  poleName: string;
  summary: string;
};

export function polesForCode(code: string, scoring: Scoring): CodePole[] {
  if (scoring.mode !== "dichotomy") return [];
  const order = scoring.codeOrder ?? scoring.dimensions.map((d) => d.id);

  return order.flatMap((dimId, i) => {
    const dim = scoring.dimensions.find((d) => d.id === dimId);
    const poleId = code[i];
    const pole = dim?.poles[poleId];
    if (!dim || !pole) return [];
    return [
      {
        dimensionId: dim.id,
        dimensionName: dim.name,
        poleId,
        poleName: pole.name,
        summary: pole.summary,
      },
    ];
  });
}

/** dichotomy 内容包里所有已发布的类型码，按字典序，用于 sitemap 和索引页。 */
export function listResultCodes(pack: TestPack): string[] {
  return Object.keys(pack.results).sort();
}
