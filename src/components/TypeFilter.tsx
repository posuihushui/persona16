"use client";

import { useEffect, useState } from "react";

/**
 * 按字母筛选 16 个类型。
 *
 * 目录页一次摆出 16 张卡，找自己那一张要从头扫。选一个字母就只留下 8 张，
 * 再选一个只剩 4 张，比翻页快得多。
 *
 * 卡片本身仍然由服务端渲染（这是可索引页面，链接必须在 HTML 里），
 * 这个组件只改已有节点的属性，不接管列表。所以没有 JS 时 16 张卡全部照常显示，
 * 只是没有筛选条——降级之后不会有任何一张卡消失。
 */
export function TypeFilter({
  groups,
  allLabel,
  hint,
}: {
  /** 每组是一条轴的两个字母，例如 [["E","I"],["S","N"],["T","F"],["J","P"]] */
  groups: string[][];
  allLabel: string;
  hint: string;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>("[data-type-code]");
    let shown = 0;
    cards.forEach((card) => {
      const code = card.getAttribute("data-type-code") ?? "";
      const hit = picked.every((letter) => code.indexOf(letter) >= 0);
      if (hit) shown++;
      if (hit) card.removeAttribute("data-filtered");
      else card.setAttribute("data-filtered", "true");
    });

    // 一组里选了两个互斥的字母会一张都不剩，直接退回全部，别让用户对着空白
    if (shown === 0 && picked.length > 0) setPicked([]);
  }, [picked]);

  const toggle = (letter: string, group: string[]) => {
    setPicked((prev) => {
      if (prev.indexOf(letter) >= 0) return prev.filter((l) => l !== letter);
      // 同一条轴上只能选一边
      return [...prev.filter((l) => group.indexOf(l) < 0), letter];
    });
  };

  return (
    <div className="type-filter">
      <div className="wrap type-filter-row">
        <button
          type="button"
          className="chip type-filter-chip"
          data-active={picked.length === 0 ? "true" : undefined}
          onClick={() => setPicked([])}
        >
          {allLabel}
        </button>
        {groups.map((group) =>
          group.map((letter) => (
            <button
              key={letter}
              type="button"
              className="chip type-filter-chip"
              data-active={picked.indexOf(letter) >= 0 ? "true" : undefined}
              onClick={() => toggle(letter, group)}
            >
              {letter}
            </button>
          )),
        )}
      </div>
      <p className="small muted type-filter-hint">{hint}</p>
    </div>
  );
}
