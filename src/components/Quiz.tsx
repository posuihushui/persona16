"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SceneIllustration } from "@/components/SceneIllustration";
import { restoreProgress } from "@/lib/quiz-progress";
import type { Question, ScaleOption } from "@/lib/types";
import ui from "../../content/ui.json";

type Props = {
  slug: string;
  version: string;
  questions: Question[];
  options: ScaleOption[];
  /** 分组提示里的情境插画，来自 content/illustrations.json 的场景名。不传就只显示文字 */
  scene?: string;
  /** 维度顺序与名字，来自内容包的 scoring.dimensions。组件不认识任何具体量表 */
  groups?: { id: string; name: string }[];
};

const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** 文案兜底：content/ui.json 里配了就用配置，没配用这里的默认值。 */
const copy = (key: string, fallback: string) =>
  (ui.quiz as unknown as Record<string, string>)[key] ?? fallback;

export function Quiz({ slug, version, questions, options, scene, groups = [] }: Props) {
  const router = useRouter();
  const storageKey = useMemo(() => `p16:progress:${slug}`, [slug]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [restored, setRestored] = useState(false);
  const [resume, setResume] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [progressNotice, setProgressNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionError, setVersionError] = useState(false);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const submittingRef = useRef(false);
  const lastPickAt = useRef(-Infinity);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusOnChange = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useBeforePaint(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        try {
          const saved = restoreProgress(JSON.parse(raw), version, questions, options);
          setAnswers(saved.answers);
          setIndex(saved.index);
          setResume(Object.keys(saved.answers).length > 0);
          if (saved.versionChanged) setProgressNotice(ui.quiz.versionChanged);
          else if (saved.repaired) setProgressNotice(ui.quiz.invalidProgress);
        } catch { setProgressNotice(ui.quiz.invalidProgress); }
      }
      // 单独探测写权限，不能把“读取成功”误报成“已保存”。
      const probe = `${storageKey}:check`;
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
    } catch { setStorageWarning(true); }
    setRestored(true);
  }, [storageKey, version, questions, options]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (focusOnChange.current) headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  const save = useCallback((nextAnswers: Record<string, number>, nextIndex: number) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version, answers: nextAnswers, index: nextIndex }));
    } catch { setStorageWarning(true); }
  }, [storageKey, version]);

  const submit = async (finalAnswers: Record<string, number>) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    setResume(false);
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch("/api/submit", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, packVersion: version, answers: finalAnswers }),
        signal: controller.signal,
      });
      if (res.status === 409) {
        setVersionError(true);
        throw new Error(ui.quiz.submitVersionChanged);
      }
      if (!res.ok) throw new Error(ui.quiz.submitError);
      const data = await res.json() as { attemptId?: unknown };
      if (typeof data.attemptId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(data.attemptId)) throw new Error(ui.quiz.submitError);
      try { window.localStorage.removeItem(storageKey); } catch { /* 答题不依赖存储权限 */ }
      router.push(`/r/${data.attemptId}`);
    } catch (err) {
      if (mounted.current) {
        setError(controller.signal.aborted ? ui.quiz.submitTimeout : err instanceof Error ? err.message : ui.quiz.submitError);
        setSubmitting(false);
        submittingRef.current = false;
      }
    } finally {
      window.clearTimeout(timer);
      requestRef.current = null;
    }
  };

  const choose = (value: number, keyboard: boolean) => {
    if (!restored || submittingRef.current || versionError || performance.now() - lastPickAt.current < 240) return;
    lastPickAt.current = performance.now();
    focusOnChange.current = keyboard;
    setResume(false);
    setProgressNotice("");
    setConfirmRestart(false);
    setError(null);
    const next = { ...answers, [questions[index].id]: value };
    setAnswers(next);
    const missing = questions.findIndex((question) => next[question.id] === undefined);
    const nextIndex = index + 1 < questions.length ? index + 1 : missing >= 0 ? missing : index;
    save(next, nextIndex);
    setDir("forward");
    setIndex(nextIndex);
    if (index === questions.length - 1 && missing < 0) void submit(next);
  };

  const goBack = () => {
    if (submittingRef.current || index === 0) return;
    focusOnChange.current = true;
    setDir("back");
    setIndex(index - 1);
    save(answers, index - 1);
    setError(null);
  };

  const restart = () => {
    if (submittingRef.current) return;
    setAnswers({}); setIndex(0); setResume(false); setConfirmRestart(false);
    setError(null); setProgressNotice(""); setDir("back");
    lastPickAt.current = -Infinity;
    save({}, 0);
  };

  const question = questions[index];
  const answered = Object.keys(answers).length;
  const complete = answered === questions.length;
  const percent = Math.round(answered / questions.length * 100);

  /*
   * 分组。48 道题连着做，用户看不到尽头也不知道在问什么方向。
   * 分组来自内容包的维度顺序，组件不认识任何一款具体量表；
   * 没传 groups 时按题号四等分兜底，「第几组 / 共几组」照样成立。
   */
  const groupCount = groups.length || 4;
  const perGroup = Math.ceil(questions.length / groupCount);
  const byDimension = groups.findIndex((g) => g.id === question.dimension);
  const groupIndex =
    byDimension >= 0 ? byDimension : Math.min(groupCount - 1, Math.floor(index / perGroup));
  const groupName = groups[groupIndex]?.name;

  return (
    <div className="quiz" aria-busy={submitting}>
      {/*
        头部承担进度：返回、第几题、退出，下沿一条进度轨。
        答题页不复用 SiteHeader —— 这里的中间不是页面名而是进度，
        右侧不是次要入口而是退出，两者职责不同，合并会把两个页面都拖累。
      */}
      <div className="quiz-topbar">
        <div className="quiz-topbar-row">
          <div className="quiz-topbar-slot">
            {index > 0 && !submitting && (
              <button type="button" className="quiz-topbar-back" onClick={goBack} aria-label="上一题">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.5 5L8 12l6.5 7" />
                </svg>
              </button>
            )}
          </div>
          <p className="quiz-topbar-title">
            第 <b>{index + 1}</b> / {questions.length} 题
          </p>
          <div className="quiz-topbar-slot quiz-topbar-slot--end">
            <Link href={`/t/${slug}`} className="quiz-topbar-exit">
              {copy("exit", "退出")}
            </Link>
          </div>
        </div>
        <div
          className="quiz-progress-rail"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="答题进度"
          aria-valuetext={`${answered} / ${questions.length}`}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      {resume && <section className="quiz-resume">
        <h2 className="h3">{ui.quiz.resumeTitle}</h2>
        <p className="small">{ui.quiz.resumeHint.replace("{count}", String(answered)).replace("{total}", String(questions.length))}</p>
        {confirmRestart && <p className="small">{ui.quiz.restartHint}</p>}
        <div className="quiz-resume-actions">
          {confirmRestart ? <><button type="button" className="btn" onClick={restart}>确认重新开始</button><button type="button" className="btn btn-ghost" onClick={() => setConfirmRestart(false)}>取消</button></>
            : <><button type="button" className="btn" onClick={() => setResume(false)}>继续答题</button><button type="button" className="btn btn-ghost" onClick={() => setConfirmRestart(true)}>重新开始</button></>}
        </div>
      </section>}
      {progressNotice && <p className="quiz-save-warning" role="status">{progressNotice}</p>}
      {storageWarning && <p className="quiz-save-warning" role="status">{ui.quiz.storageWarning}</p>}

      {/* 现在在问哪一方面。定位信息，不是装饰，所以每题都在 */}
      <div className="quiz-group" data-art={scene ? "true" : undefined}>
        {scene && <SceneIllustration scene={scene} className="quiz-group-art" />}
        <p>
          第 {groupIndex + 1} / {groupCount} 组{groupName ? ` · ${groupName}` : ""}。
          {copy("groupHint", "跟着日常的自己选，没有标准答案。")}
        </p>
      </div>

      <div className="quiz-stage">
        <div key={index} className="quiz-card" data-dir={dir}>
          <h1 ref={headingRef} className="quiz-question" tabIndex={-1} id="quiz-question">{question.text}</h1>
          <div className="quiz-options" role="group" aria-labelledby="quiz-question">
            {options.map((option) => <button key={option.value} type="button" className="option" data-weight={option.value}
              data-selected={answers[question.id] === option.value} aria-pressed={answers[question.id] === option.value}
              onClick={(event) => choose(option.value, event.detail === 0)} disabled={submitting || !restored || versionError}>
              <span className="option-dot" aria-hidden="true" /><span>{option.label}</span>
            </button>)}
          </div>
        </div>
      </div>

      {/*
        自动保存本来就在做（quiz-progress.ts 落 localStorage），
        但用户不知道，于是中途离开会心虚。这里只是把已有行为说出来。
        存储被禁时不说这句话，上面的 storageWarning 会接手。
      */}
      <div className="quiz-autosave">
        <span>{storageWarning ? "" : copy("autoSaved", "进度已自动保存")}</span>
        <span className="quiz-group-dots" aria-hidden="true">
          {Array.from({ length: groupCount }, (_, i) => (
            <span key={i} data-done={i < groupIndex ? "true" : undefined} />
          ))}
        </span>
      </div>

      <div className="quiz-foot">
        {submitting && <span className="quiz-status" role="status">{ui.quiz.submitting}</span>}
        {index === 0 && !submitting && <span className="quiz-status">{ui.quiz.firstHint}</span>}
      </div>

      {(error || (complete && !submitting)) && <div className="quiz-error" role={error ? "alert" : "status"}>
        <p>{error || ui.quiz.completed}</p>
        {versionError ? <button type="button" className="btn btn-block" onClick={() => window.location.reload()}>刷新题库</button>
          : <button type="button" className="btn btn-block" disabled={submitting} onClick={() => void submit(answers)}>{error ? "重新提交" : "查看结果"}</button>}
      </div>}
    </div>
  );
}
