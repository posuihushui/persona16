import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { enumerateCodes, score } from "../src/lib/scoring.ts";
import type { Questions, Scoring } from "../src/lib/types.ts";

/**
 * 计分引擎的行为约定。
 * 这些断言保护的是 agents.md 原则 6 和 7：引擎与具体测试无关，且结果可复现。
 */

const PACK = path.join(process.cwd(), "content", "tests", "persona16");
const questions: Questions = JSON.parse(
  fs.readFileSync(path.join(PACK, "questions.json"), "utf8"),
);
const scoring: Scoring = JSON.parse(fs.readFileSync(path.join(PACK, "scoring.json"), "utf8"));

/** 把每个维度都推向指定的一极。 */
function answersFor(target: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of questions.questions) {
    out[q.id] = q.pole === target[q.dimension] ? 2 : -2;
  }
  return out;
}

test("每个类型码都能被真实作答命中", () => {
  for (const code of enumerateCodes(scoring)) {
    const target: Record<string, string> = {};
    (scoring.codeOrder ?? []).forEach((dimId, i) => {
      target[dimId] = code[i];
    });
    assert.equal(score(answersFor(target), questions, scoring).code, code);
  }
});

test("题库两极平衡，全部答同意会落在 tieBreak 上", () => {
  const all: Record<string, number> = {};
  for (const q of questions.questions) all[q.id] = 2;

  const result = score(all, questions, scoring);
  const expected = (scoring.codeOrder ?? [])
    .map((id) => scoring.dimensions.find((d) => d.id === id)!.tieBreak)
    .join("");

  assert.equal(result.code, expected, "默认同意倾向应被反向题抵消");
  for (const dim of result.dimensions) {
    assert.equal(dim.percent, 50, `维度 ${dim.id} 未被抵消到中点`);
  }
});

test("同一份作答重复计分结果一致", () => {
  const answers = answersFor({ EI: "I", SN: "N", TF: "F", JP: "P" });
  const a = score(answers, questions, scoring);
  const b = score(answers, questions, scoring);
  assert.deepEqual(a, b);
});

test("缺题会抛错，不会给出半份结果", () => {
  const answers = answersFor({ EI: "E", SN: "S", TF: "T", JP: "J" });
  delete answers[questions.questions[0].id];
  assert.throws(() => score(answers, questions, scoring), /缺少作答/);
});

test("strength 表示偏向命中极的程度，中点是 50", () => {
  const neutral: Record<string, number> = {};
  for (const q of questions.questions) neutral[q.id] = 0;

  for (const dim of score(neutral, questions, scoring).dimensions) {
    assert.equal(dim.percent, 50);
    assert.equal(dim.strength, 50);
  }

  const extreme = score(answersFor({ EI: "E", SN: "S", TF: "T", JP: "J" }), questions, scoring);
  for (const dim of extreme.dimensions) {
    assert.equal(dim.strength, 100);
  }
});

test("bands 模式无需改引擎即可工作", () => {
  // 用同一套题目挂一个不同结果模式的计分配置，验证引擎与具体测试无关
  const bandScoring: Scoring = {
    ...scoring,
    mode: "bands",
    bandSource: "total",
    bands: [
      { id: "low", maxPercent: 40, name: "较低" },
      { id: "mid", maxPercent: 60, name: "中等" },
      { id: "high", maxPercent: 100, name: "较高" },
    ],
  };

  const neutral: Record<string, number> = {};
  for (const q of questions.questions) neutral[q.id] = 0;
  assert.equal(score(neutral, questions, bandScoring).code, "mid");

  const high = answersFor({ EI: "E", SN: "S", TF: "T", JP: "J" });
  assert.equal(score(high, questions, bandScoring).code, "high");

  const low = answersFor({ EI: "I", SN: "N", TF: "F", JP: "P" });
  assert.equal(score(low, questions, bandScoring).code, "low");
});

test("profile 模式返回固定结果码", () => {
  const neutral: Record<string, number> = {};
  for (const q of questions.questions) neutral[q.id] = 0;
  const result = score(neutral, questions, { ...scoring, mode: "profile" });
  assert.equal(result.code, "PROFILE");
  assert.equal(result.dimensions.length, scoring.dimensions.length);
});
