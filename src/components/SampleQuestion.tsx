"use client";

import { useState } from "react";
import type { Question, ScaleOption } from "@/lib/types";

/**
 * 试答一题。
 *
 * 介绍页最大的门槛是「48 题要多久、题目难不难」。写多少字都不如让用户点一下。
 * 这里放一道真题和真实的五档量表，点完给一句说明就结束。
 *
 * 它不计分、不存进度、不产生任何结果，选完也不会跳走——
 * 说明文案里写清楚了这一点，避免用户以为自己已经开始答题了。
 * 题目从内容包里取，组件不写死任何题干。
 */
export function SampleQuestion({
  question,
  options,
  dimensionName,
  eyebrow,
  hint,
  feedback,
  reset,
}: {
  question: Question;
  options: ScaleOption[];
  dimensionName: string;
  eyebrow: string;
  hint: string;
  /** 形如 "这道题问的是「{dimension}」……" */
  feedback: string;
  reset: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <section className="sample">
      <p className="sample-eyebrow">{eyebrow}</p>
      <p className="sample-question">{question.text}</p>

      <div className="sample-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="option"
            data-selected={picked === option.value ? "true" : undefined}
            onClick={() => setPicked(option.value)}
          >
            <span className="option-dot" aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>

      {picked === null ? (
        <p className="sample-hint">{hint}</p>
      ) : (
        <div className="sample-answer" role="status">
          <p>{feedback.replace("{dimension}", dimensionName)}</p>
          <button type="button" className="sample-reset" onClick={() => setPicked(null)}>
            {reset}
          </button>
        </div>
      )}
    </section>
  );
}
