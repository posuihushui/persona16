"use client";

import { useEffect, useState } from "react";
import { splitClaim } from "@/lib/prose";
import type { BlindSpot } from "@/lib/types";

/**
 * 盲点与动作清单。
 *
 * 每条盲点原来是一张卡里的两段话，用户读完点头，然后什么也不会发生。
 * 拆成两格之后左边是「看到的」右边是「这周做的」，动作和判断不再混成一段；
 * 再给动作加一个勾选框，这份报告就有了唯一一个可以回来看的理由。
 *
 * 勾选只存在这台设备的 localStorage 里，不上报服务端，也不影响任何权益。
 * 微信隐私模式下读写都会抛异常，所以两个方向都包了 try/catch：
 * 存不下的时候清单照常能勾，只是刷新之后回到未勾状态。
 */
export function ActionChecklist({
  items,
  storageKey,
  actionLabel,
  doneLabel,
}: {
  items: BlindSpot[];
  /** 每次作答一份，换一次结果不串台 */
  storageKey: string;
  actionLabel: string;
  /** 形如 "已经做了 {done} / {total} 条" */
  doneLabel: string;
}) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as unknown;
        if (Array.isArray(saved) && saved.length === items.length) {
          setDone(items.map((_, i) => saved[i] === true));
        }
      }
    } catch {
      // 隐私模式或写满了，保持全部未勾
    }
    setReady(true);
  }, [storageKey, items.length, items]);

  const toggle = (index: number) => {
    setDone((prev) => {
      const next = prev.map((value, i) => (i === index ? !value : value));
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // 存不下就只在这一次访问里生效
      }
      return next;
    });
  };

  const count = done.filter(Boolean).length;

  return (
    <div className="checklist">
      {items.map((item, i) => {
        const { lead, body } = splitClaim(item.point);
        return (
          <div className="spot" key={item.point.slice(0, 16)} data-done={done[i] ? "true" : undefined}>
            <div className="spot-see">
              <b>{lead}</b>
              {body && <span>{body}</span>}
            </div>
            <label className="spot-do">
              <input
                type="checkbox"
                checked={done[i]}
                onChange={() => toggle(i)}
                aria-label={`${actionLabel}：${item.action}`}
              />
              <span className="spot-do-body">
                <span className="spot-do-label">{actionLabel}</span>
                <span className="spot-do-text">{item.action}</span>
              </span>
            </label>
          </div>
        );
      })}
      {ready && count > 0 && (
        <p className="checklist-count" role="status">
          {doneLabel.replace("{done}", String(count)).replace("{total}", String(items.length))}
        </p>
      )}
    </div>
  );
}
