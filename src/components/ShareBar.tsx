"use client";

import { useEffect, useRef, useState } from "react";
import { copyText, publicTypePath } from "@/components/ShareActions";
import ui from "../../content/ui.json";

export function ShareBar({ attemptId, slug, code, version, label }: {
  attemptId: string; slug: string; code: string; version: string; label: string;
}) {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState("");
  const [card, setCard] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [environmentHint, setEnvironmentHint] = useState("");
  const generatingRef = useRef(false);
  const mounted = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    setCanShare(typeof navigator.share === "function");
    const ua = navigator.userAgent;
    setEnvironmentHint(/MicroMessenger/i.test(ua) ? ui.share.wechatHint
      : /aweme|douyin|BytedanceWebview/i.test(ua) ? ui.share.douyinHint : "");
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => { if (fallback) inputRef.current?.select(); }, [fallback]);

  const track = (action: string, outcome: string) => {
    void fetch("/api/track", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "share_click", slug, attemptId, props: { code, action, outcome } }),
    }).catch(() => {});
  };
  const shareUrl = () => `${window.location.origin}${publicTypePath(slug, code)}`;

  const copy = async () => {
    const url = shareUrl();
    const copied = await copyText(url);
    setFallback(copied ? "" : url);
    setMessage(copied ? ui.share.copied : ui.share.copyFallback);
    track("copy", copied ? "copied" : "manual");
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: `${code} · ${label}`, url: shareUrl() });
      track("native", "completed");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage(ui.share.nativeError);
      track("native", "failed");
    }
  };

  const generateCard = async () => {
    if (generatingRef.current) return;
    setShowCard(true);
    if (card) return;
    generatingRef.current = true;
    setGenerating(true);
    setMessage("");
    const controller = new AbortController();
    let objectUrl = "";
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const params = new URLSearchParams({ slug, code, version });
      const response = await fetch(`/api/og?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error("card request failed");
      objectUrl = URL.createObjectURL(await response.blob());
      const picture = new Image();
      await new Promise<void>((resolve, reject) => {
        picture.onload = () => resolve();
        picture.onerror = () => reject(new Error("card render failed"));
        controller.signal.addEventListener("abort", () => reject(new Error("card timeout")), { once: true });
        if (controller.signal.aborted) { reject(new Error("card timeout")); return; }
        picture.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = picture.naturalWidth;
      canvas.height = picture.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas unavailable");
      context.drawImage(picture, 0, 0);
      const png = canvas.toDataURL("image/png");
      if (mounted.current) setCard(png);
      track("card", "generated");
    } catch {
      if (mounted.current) setMessage(ui.share.cardError);
      track("card", "failed");
    } finally {
      window.clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      generatingRef.current = false;
      if (mounted.current) setGenerating(false);
    }
  };

  return (
    <section className="share-panel stack" aria-label={ui.share.title}>
      <div className="share-actions">
        <button className="btn btn-block" type="button" onClick={generateCard} disabled={generating} aria-expanded={showCard}>
          {generating ? "正在生成卡片…" : "保存我的类型卡"}
        </button>
        <button className="btn btn-ghost btn-block" type="button" onClick={copy}>复制类型链接</button>
      </div>
      {canShare && <button className="share-text-button" type="button" onClick={nativeShare}>更多分享方式 →</button>}
      <p className="small muted">{environmentHint || ui.share.hint}</p>
      <p className="small muted">{ui.share.privacy}</p>
      <p className="small" role="status" aria-live="polite">{message}</p>
      {fallback && <input ref={inputRef} className="field share-url" aria-label="类型分享链接" readOnly value={fallback} onFocus={(event) => event.target.select()} />}
      {showCard && card && <div className="share-preview stack">
        <p className="small">{ui.share.cardHint}</p>
        {/* 本地生成的 PNG 必须保留原始 img，便于 WebView 长按保存。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card} width={900} height={1200} alt={ui.share.cardAlt.replace("{code}", code)} />
        <a className="btn btn-ghost btn-block" href={card} download={`Persona16-${code}.png`}>下载卡片</a>
        <button className="share-text-button" type="button" onClick={() => setShowCard(false)}>收起卡片</button>
      </div>}
    </section>
  );
}
