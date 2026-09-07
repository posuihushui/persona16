"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreProgress } from "@/lib/quiz-progress";
import type { Question, ScaleOption } from "@/lib/types";
import ui from "../../content/ui.json";

type Props = { slug: string; version: string; questions: Question[]; options: ScaleOption[] };
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function Quiz({ slug, version, questions, options }: Props) {
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

  return (
    <div className="quiz" aria-busy={submitting}>
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
      <div className="quiz-head">
        <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="答题进度" aria-valuetext={`${answered} / ${questions.length}`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="quiz-index"><b>{index + 1}</b><span> / {questions.length}</span></p>
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
      <div className="quiz-foot">
        {index > 0 && !submitting && <button type="button" className="quiz-back" onClick={goBack}>上一题</button>}
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
