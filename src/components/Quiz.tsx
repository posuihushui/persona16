"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Question, ScaleOption } from "@/lib/types";

type Props = {
  slug: string;
  version: string;
  questions: Question[];
  options: ScaleOption[];
};

type Saved = { version: string; answers: Record<string, number>; index: number };

/**
 * 答题。
 *
 * 界面上只保留三样东西：进度、题干、选项。计数、提示、下一题按钮全部去掉，
 * 因为它们要么和进度条重复，要么用户答第二题时就已经不需要了。
 *
 * 切题是即时的：点下去当帧就换题，新题从侧面滑入。
 * 不做「先淡出再淡入」的两段式，理由有两个：一是 48 道题每题多等 170 毫秒，
 * 累计就是白白多花 8 秒；二是那种做法依赖定时器，页面被挂起或机器卡的时候
 * 定时器会被节流到一秒开外，用户点了没反应。入场动画本身已经足够顺，
 * 而且它不挡任何操作。
 *
 * 题干区有固定高度，长短不一的题目不会把选项顶得上下跳。
 *
 * 进度写 localStorage，刷新或误退出后可以恢复。恢复放在 useLayoutEffect 里，
 * 在浏览器绘制之前完成，回头继续答的用户不会先看到第一题再跳走。
 * 微信内置浏览器的隐私模式下 localStorage 会抛异常，所有读写都包在 try/catch 里。
 */

/** 服务端没有 localStorage，SSR 时退化成普通 effect，避免 React 警告。 */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;
export function Quiz({ slug, version, questions, options }: Props) {
  const router = useRouter();
  const storageKey = useMemo(() => `p16:progress:${slug}`, [slug]);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  /** 进度是否已经从本地恢复过。只用来决定要不要往回写，不用来挡渲染。 */
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 入场动画的方向。往后答是从右滑入，退回上一题是从左滑入。 */
  const [dir, setDir] = useState<"forward" | "back">("forward");

  useBeforePaint(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Saved;
        // 内容包升版后旧进度作废，避免题目对不上
        if (saved.version === version) {
          setAnswers(saved.answers ?? {});
          setIndex(Math.min(saved.index ?? 0, questions.length - 1));
        }
      }
    } catch {
      // 隐私模式下读不到，直接从头开始
    }
    setRestored(true);
  }, [storageKey, version, questions.length]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version, answers, index }));
    } catch {
      // 写不进去不影响答题，只是刷新后无法恢复
    }
  }, [restored, storageKey, version, answers, index]);

  const submit = useCallback(
    async (finalAnswers: Record<string, number>) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, answers: finalAnswers }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "提交失败");
        }
        const data = (await res.json()) as { attemptId: string };
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // 清不掉也没关系
        }
        router.push(`/r/${data.attemptId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "提交失败，请重试");
        setSubmitting(false);
      }
    },
    [router, slug, storageKey],
  );

  /** 立即切到某一题，只设置入场方向，不等任何定时器。 */
  const goTo = useCallback((next: number, direction: "forward" | "back") => {
    setDir(direction);
    setIndex(next);
  }, []);

  const choose = (value: number) => {
    if (submitting) return;

    const q = questions[index];
    const next = { ...answers, [q.id]: value };
    setAnswers(next);

    if (index + 1 < questions.length) {
      goTo(index + 1, "forward");
      return;
    }

    // 最后一题：先补上还没答的，都答完了才提交
    const unanswered = questions.findIndex((item) => next[item.id] === undefined);
    if (unanswered >= 0) {
      goTo(unanswered, "forward");
      return;
    }

    void submit(next);
  };

  const goBack = () => {
    if (submitting || index === 0) return;
    goTo(index - 1, "back");
  };

  const question = questions[index];
  const answered = Object.keys(answers).length;
  const percent = Math.round((answered / questions.length) * 100);

  return (
    <div className="quiz">
      <div className="quiz-head">
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="答题进度"
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="quiz-index">
          <b>{index + 1}</b>
          <span> / {questions.length}</span>
        </p>
      </div>

      <div className="quiz-stage">
        {/* key 变化会重挂载，入场动画因此每题都会重放 */}
        <div key={index} className="quiz-card" data-dir={dir}>
          <h1 className="quiz-question">{question.text}</h1>

          <div className="quiz-options">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className="option"
                data-weight={option.value}
                data-selected={answers[question.id] === option.value}
                onClick={() => choose(option.value)}
                disabled={submitting}
              >
                <span className="option-dot" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="quiz-foot">
        {index > 0 && !submitting && (
          <button type="button" className="quiz-back" onClick={goBack}>
            上一题
          </button>
        )}
        {submitting && <span className="quiz-status">正在计算结果…</span>}
        {index === 0 && !submitting && (
          <span className="quiz-status">凭第一感觉选就好</span>
        )}
      </div>

      {error && <p className="notice">{error}</p>}
    </div>
  );
}
