import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { restoreProgress } from "../src/lib/quiz-progress.ts";
import type { Questions } from "../src/lib/types.ts";

const pack: Questions = JSON.parse(fs.readFileSync("content/tests/persona16/questions.json", "utf8"));
const questions = pack.questions;
const options = pack.scale.options;
const restore = (raw: unknown) => restoreProgress(raw, pack.version, questions, options);

test("损坏索引不会使答题页越界", () => {
  for (const index of [-1, 9999, 0.5, "4", null]) {
    const saved = restore({ version: pack.version, answers: { [questions[0].id]: 2 }, index });
    assert.equal(saved.index, 1);
    assert.equal(saved.repaired, true);
  }
});
test("只恢复当前题目和合法量表值，保留中立选项0", () => {
  const saved = restore({ version: pack.version, index: 40, answers: {
    [questions[0].id]: 0, [questions[1].id]: 999, [questions[2].id]: "2", injected: 2,
  } });
  assert.deepEqual(saved.answers, { [questions[0].id]: 0 });
  assert.equal(saved.index, 1);
});
test("跨版本、null、数组和损坏answers都不会复用", () => {
  assert.equal(restore({ version: "0.0.0", answers: { [questions[0].id]: 2 } }).versionChanged, true);
  for (const raw of [null, [], "data", { version: pack.version, answers: null }, { version: pack.version, answers: [] }]) {
    assert.deepEqual(restore(raw).answers, {});
  }
});
test("已答完的缓存停在最后一题，不丢答案", () => {
  const answers = Object.fromEntries(questions.map((q) => [q.id, 1]));
  const saved = restore({ version: pack.version, answers, index: questions.length - 1 });
  assert.deepEqual(saved.answers, answers);
  assert.equal(saved.index, questions.length - 1);
});
test("回看已答题的索引保留，跳过未答题的缓存回到缺题", () => {
  const answers = { [questions[0].id]: 1, [questions[1].id]: 2 };
  assert.equal(restore({ version: pack.version, answers, index: 0 }).index, 0);
  assert.equal(restore({ version: pack.version, answers, index: 20 }).index, 2);
});
