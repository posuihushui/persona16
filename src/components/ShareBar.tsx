"use client";

import { useState } from "react";

/**
 * 分享。只提供复制链接和引导截图，不做任何分享解锁（agents.md 原则 1）。
 * 微信内 JS-SDK 不一定注入成功，所以复制链接是永远可用的兜底。
 */
export function ShareBar({ attemptId, code }: { attemptId: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}/r/${attemptId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("复制这个链接分享给朋友", url);
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "share_click", attemptId, props: { code } }),
    }).catch(() => {});
  };

  return (
    <div className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
      <button type="button" className="btn btn-ghost btn-block" onClick={copy}>
        {copied ? "链接已复制" : "复制链接，发给能对上号的人"}
      </button>
      <p className="small muted" style={{ margin: 0 }}>
        想发朋友圈的话，直接截图上面那张卡片就行。
      </p>
    </div>
  );
}
