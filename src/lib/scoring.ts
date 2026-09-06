import type {
  DimensionScore,
  Questions,
  ScoreResult,
  Scoring,
} from "./types";

/**
 * 计分引擎与具体测试无关。它只消费内容包声明的维度、权重和结果模式。
 * 如果某天需要在这里写 `if (slug === ...)`，说明内容包 schema 设计不足，
 * 应当先改 docs/product/test-pack-spec.md 再改这里。
 */

export class ScoringError extends Error {}

function maxAbsValue(questions: Questions): number {
  return Math.max(...questions.scale.options.map((o) => Math.abs(o.value)));
}

function computeDimensions(
  answers: Record<string, number>,
  questions: Questions,
  scoring: Scoring,
): DimensionScore[] {
  const scaleMax = maxAbsValue(questions);
  const byDimension = new Map<string, typeof questions.questions>();
  for (const q of questions.questions) {
    const list = byDimension.get(q.dimension) ?? [];
    list.push(q);
    byDimension.set(q.dimension, list);
  }

  return scoring.dimensions.map((dim) => {
    const items = byDimension.get(dim.id) ?? [];
    if (items.length === 0) {
      throw new ScoringError(`维度 ${dim.id} 没有任何题目`);
    }

    let raw = 0;
    let max = 0;
    for (const q of items) {
      const answer = answers[q.id];
      if (answer === undefined) {
        throw new ScoringError(`题目 ${q.id} 缺少作答`);
      }
      const sign = q.pole === dim.positivePole ? 1 : -1;
      raw += answer * q.weight * sign;
      max += scaleMax * q.weight;
    }

    const percent = ((raw + max) / (2 * max)) * 100;
    const otherPole = Object.keys(dim.poles).find((p) => p !== dim.positivePole);
    if (!otherPole) {
      throw new ScoringError(`维度 ${dim.id} 缺少第二极`);
    }

    let pole: string;
    if (percent > 50) pole = dim.positivePole;
    else if (percent < 50) pole = otherPole;
    else pole = dim.tieBreak;

    // strength 是「偏向命中极的程度」，50 表示两边完全均衡，100 表示极端偏向。
    const strength = pole === dim.positivePole ? percent : 100 - percent;

    return {
      id: dim.id,
      name: dim.name,
      raw,
      max,
      percent: Math.round(percent * 10) / 10,
      pole,
      poleName: dim.poles[pole]?.name ?? pole,
      poleSummary: dim.poles[pole]?.summary ?? "",
      strength: Math.round(strength * 10) / 10,
    };
  });
}

function dichotomyCode(dims: DimensionScore[], scoring: Scoring): string {
  const order = scoring.codeOrder ?? scoring.dimensions.map((d) => d.id);
  return order
    .map((id) => {
      const hit = dims.find((d) => d.id === id);
      if (!hit) throw new ScoringError(`codeOrder 引用了不存在的维度 ${id}`);
      return hit.pole;
    })
    .join("");
}

function bandCode(dims: DimensionScore[], scoring: Scoring): string {
  const bands = scoring.bands;
  if (!bands || bands.length === 0) {
    throw new ScoringError("bands 模式缺少 bands 定义");
  }
  const source = scoring.bandSource ?? "total";
  let percent: number;
  if (source === "total") {
    percent = dims.reduce((sum, d) => sum + d.percent, 0) / dims.length;
  } else if (source.startsWith("dimension:")) {
    const id = source.slice("dimension:".length);
    const hit = dims.find((d) => d.id === id);
    if (!hit) throw new ScoringError(`bandSource 引用了不存在的维度 ${id}`);
    percent = hit.percent;
  } else {
    throw new ScoringError(`无法识别的 bandSource: ${source}`);
  }
  const sorted = [...bands].sort((a, b) => a.maxPercent - b.maxPercent);
  const hit = sorted.find((b) => percent <= b.maxPercent) ?? sorted[sorted.length - 1];
  return hit.id;
}

export function score(
  answers: Record<string, number>,
  questions: Questions,
  scoring: Scoring,
): ScoreResult {
  const dimensions = computeDimensions(answers, questions, scoring);

  let code: string;
  switch (scoring.mode) {
    case "dichotomy":
      code = dichotomyCode(dimensions, scoring);
      break;
    case "bands":
      code = bandCode(dimensions, scoring);
      break;
    case "profile":
      code = "PROFILE";
      break;
    default:
      throw new ScoringError(`无法识别的结果模式: ${scoring.mode}`);
  }

  return { code, dimensions };
}

/** 枚举 dichotomy 模式下所有可能的类型码，供内容包校验使用。 */
export function enumerateCodes(scoring: Scoring): string[] {
  if (scoring.mode !== "dichotomy") return [];
  const order = scoring.codeOrder ?? scoring.dimensions.map((d) => d.id);
  let acc: string[] = [""];
  for (const id of order) {
    const dim = scoring.dimensions.find((d) => d.id === id);
    if (!dim) throw new ScoringError(`codeOrder 引用了不存在的维度 ${id}`);
    const poles = Object.keys(dim.poles);
    acc = acc.flatMap((prefix) => poles.map((p) => prefix + p));
  }
  return acc;
}
