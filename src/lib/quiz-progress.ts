import type { Question, ScaleOption } from "./types";

export type Progress = { version: string; answers: Record<string, number>; index: number };
export type RestoredProgress = Progress & { repaired: boolean; versionChanged: boolean };

/** 本地存储是不可信输入，恢复时只接受当前题目、量表值与安全索引。 */
export function restoreProgress(raw: unknown, version: string, questions: Question[], options: ScaleOption[]): RestoredProgress {
  const empty: RestoredProgress = { version, answers: {}, index: 0, repaired: false, versionChanged: false };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...empty, repaired: true };
  const saved = raw as Record<string, unknown>;
  if (saved.version !== version) return { ...empty, versionChanged: true };
  const source = saved.answers;
  if (!source || typeof source !== "object" || Array.isArray(source)) return { ...empty, repaired: true };
  const answers: Record<string, number> = {};
  const values = new Set(options.map((option) => option.value));
  for (const question of questions) {
    const value = (source as Record<string, unknown>)[question.id];
    if (typeof value === "number" && values.has(value)) answers[question.id] = value;
  }
  const repaired = Object.keys(source).length !== Object.keys(answers).length;
  const firstUnanswered = questions.findIndex((question) => answers[question.id] === undefined);
  const validIndex = typeof saved.index === "number" && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < questions.length;
  // 避免损坏缓存把用户带到未答题后面；已完成的缓存停在最后一题，等待明确提交。
  const index = validIndex && !repaired
    ? Math.min(saved.index as number, firstUnanswered < 0 ? questions.length - 1 : firstUnanswered)
    : Math.max(0, firstUnanswered < 0 ? questions.length - 1 : firstUnanswered);
  return { version, answers, index, repaired: repaired || !validIndex || index !== saved.index, versionChanged: false };
}
