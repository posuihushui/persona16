"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { copyText, publicTypePath } from "@/components/ShareActions";
import ui from "../../content/ui.json";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ReportOutline } from "@/components/ReportOutline";
import type { PrepayResult } from "@/lib/pay/provider";
import type { Paywall as PaywallConfig } from "@/lib/types";

type Prepay = PrepayResult;

type BridgeResult = { err_msg?: string };
declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke(
        api: string,
        params: Record<string, string>,
        callback: (res: BridgeResult) => void,
      ): void;
    };
  }
}

/** 支付完成后向服务端确认的节奏。微信回调通常在几秒内到，超时后引导用户手动刷新。 */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30000;

/** 服务端算好的报价。客户端只负责展示，不参与定价。 */
export type QuoteView = {
  amount: number;
  listAmount: number;
  originalAmount?: number;
  discount: { percent: number; expiresAt: string } | null;
};

const yuan = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, "");

/** 把毫秒差写成 03:12:45。到点返回 null，由调用方决定怎么处理。 */
function formatLeft(ms: number): string | null {
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function Countdown({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  // 服务端与首次 hydration 使用相同占位，避免跨秒造成文本不一致。
  const [left, setLeft] = useState<string | null>(null);
  const expired = useRef(false);

  useEffect(() => {
    expired.current = false;
    const tick = () => {
      const next = formatLeft(new Date(expiresAt).getTime() - Date.now());
      setLeft(next);
      if (next === null && !expired.current) {
        expired.current = true;
        onExpire();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (left === null) return null;

  return (
    <p className="countdown">
      <Icon name="clock" size={16} />
      <span>
        {ui.checkout.countdown.replace("{time}", left)}
      </span>
    </p>
  );
}

/**
 * 付款界面。
 *
 * 价格全部由服务端算好后传进来，这个组件不做任何价格计算，
 * 也不向服务端发送价格。下单时服务端会重新算一遍，
 * 不复用这里展示过的数字。
 *
 * 权益以服务端支付回调为准发放，前端的支付成功回调只用来触发确认。
 * 微信的回调会丢也会迟到，所以支付成功后主动轮询订单状态接口。
 */
export function Checkout({
  attemptId,
  slug,
  code,
  paywall,
  quote,
}: {
  attemptId: string;
  slug: string;
  code: string;
  paywall: PaywallConfig;
  quote: QuoteView;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [shareFallback, setShareFallback] = useState("");
  const claimingRef = useRef(false);
  const busyRef = useRef(false);

  const discountConfig = paywall.discount;
  const active = quote.discount;

  const handleExpire = useCallback(() => {
    // 券过期了，让服务端重新算一次价，界面回到原价
    router.refresh();
  }, [router]);

  /**
   * 分享并领取优惠。
   *
   * 分享不解锁任何内容，只影响价格。免费部分在分享之前之后完全一样。
   * 优惠力度和有效期由服务端按内容包配置写死，这里不发送任何参数。
   */
  const shareAndClaim = async (manuallyCopied = false) => {
    if (claimingRef.current) return;
    claimingRef.current = true;
    setClaiming(true);
    setMessage(null);

    const url = `${window.location.origin}${publicTypePath(slug, code)}`;
    if (!manuallyCopied && !(await copyText(url))) {
      setShareFallback(url);
      setMessage(ui.share.copyFallback);
      setClaiming(false);
      claimingRef.current = false;
      return;
    }
    setShareFallback("");
    setShared(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/discount/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? ui.checkout.claimError);
      }
      router.refresh();
    } catch (err) {
      setMessage(controller.signal.aborted ? ui.checkout.claimError : err instanceof Error ? err.message : ui.checkout.claimError);
    } finally {
      window.clearTimeout(timeout);
      setClaiming(false);
      claimingRef.current = false;
    }
  };

  const confirmPayment = async (orderId: string) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    setMessage(ui.checkout.paymentConfirming);

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(`/api/order/${orderId}/status`, { cache: "no-store", signal: controller.signal });
        if (res.ok) {
          const data = (await res.json()) as { paid: boolean };
          if (data.paid) {
            setMessage(ui.checkout.paymentConfirmed);
            router.push(`/r/${attemptId}/report`);
            return;
          }
        }
      } catch {
        // 网络抖动继续重试
      } finally {
        window.clearTimeout(timeout);
      }
    }

    setMessage(ui.checkout.paymentPending);
    setGuidance(
      ui.checkout.paymentPendingHint,
    );
    setBusy(false);
    busyRef.current = false;
  };

  const pay = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    setGuidance(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId }),
        signal: controller.signal,
      });
      const data = (await res.json()) as
        | { alreadyPaid: true; retrieveCode: string }
        | { orderId: string; retrieveCode: string; prepay: Prepay }
        | { prepay: Prepay }
        | { error: string };

      if ("error" in data) throw new Error(data.error);
      if ("alreadyPaid" in data) {
        router.push(`/r/${attemptId}/report`);
        return;
      }

      const { prepay } = data;

      if (prepay.kind === "auth") {
        window.location.href = prepay.url;
        return;
      }
      if (prepay.kind === "unsupported") {
        setGuidance(prepay.guidance);
        setMessage(prepay.reason);
        setBusy(false);
        busyRef.current = false;
        return;
      }
      if (prepay.kind === "redirect" || prepay.kind === "mock") {
        window.location.href = prepay.url;
        return;
      }

      if (!window.WeixinJSBridge) {
        setMessage(ui.checkout.bridgeUnavailable);
        setGuidance(ui.checkout.bridgeHint);
        setBusy(false);
        busyRef.current = false;
        return;
      }

      const orderId = "orderId" in data ? data.orderId : null;
      window.WeixinJSBridge.invoke("getBrandWCPayRequest", prepay.params, (result) => {
        if (result.err_msg === "get_brand_wcpay_request:ok" && orderId) {
          void confirmPayment(orderId);
        } else if (result.err_msg === "get_brand_wcpay_request:cancel") {
          setMessage(ui.checkout.paymentCancelled);
          setBusy(false);
          busyRef.current = false;
        } else {
          setMessage(ui.checkout.paymentIncomplete);
          setGuidance(ui.checkout.paymentRetry);
          setBusy(false);
          busyRef.current = false;
        }
      });
    } catch (err) {
      setMessage(controller.signal.aborted ? ui.checkout.orderError : err instanceof Error ? err.message : ui.checkout.orderError);
      setBusy(false);
      busyRef.current = false;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  /** 60 写成「6 折」，65 写成「6.5 折」 */
  const asOff = (percent: number) => (percent / 10).toFixed(percent % 10 ? 1 : 0);
  const offLabel = active ? `${asOff(active.percent)} 折` : null;

  return (
    <section className="checkout">
      <div className="checkout-head">
        <h2 className="checkout-title">{paywall.productName}</h2>
        <p className="checkout-sub">{ui.checkout.subtitle}</p>
      </div>

      <div className="checkout-body">
        {/*
         * 十行带锁文字改成目录网格。行数没变，但每一项成了一张卡，
         * 用户扫一遍就知道报告里有几块内容，不用逐行读。
         * 卡上只有 paywall.json 的 locked 标题和钩子，正文一个字都不进这里。
         */}
        <p className="checkout-outline-title">{ui.checkout.outlineTitle}</p>
        <ReportOutline items={paywall.locked} moreLabel={ui.checkout.outlineMore} />

        <div className="price-row">
          <span className="price-now">
            <small>¥</small>
            {yuan(quote.amount)}
          </span>
          <span>
            {quote.amount !== quote.listAmount && (
              <span className="price-was">¥{yuan(quote.listAmount)}</span>
            )}
            {!active && quote.originalAmount && quote.originalAmount !== quote.listAmount && (
              <span className="price-was">¥{yuan(quote.originalAmount)}</span>
            )}
            {offLabel && <span className="price-off">{offLabel}</span>}
          </span>
        </div>

        {active && <Countdown expiresAt={active.expiresAt} onExpire={handleExpire} />}

        {/* 分享只影响价格，不解锁任何内容。免费部分在分享前后完全一样。 */}
        {!active && discountConfig?.trigger === "share" && (
          <div className="fission">
            <p className="fission-title">
              {ui.checkout.shareOffer.replace("{hours}", String(discountConfig.windowHours)).replace("{off}", asOff(discountConfig.percent))}
            </p>
            <p className="fission-hint">
              {ui.checkout.shareHint}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => void shareAndClaim()}
              disabled={claiming}
            >
              {claiming ? "处理中…" : shared ? "已复制链接，重新领取优惠" : "复制链接并领取优惠"}
            </button>
            {shareFallback && <div className="stack">
              <input className="field share-url" aria-label="类型分享链接" readOnly value={shareFallback} onFocus={(event) => event.target.select()} />
              <button className="btn btn-ghost btn-block" type="button" onClick={() => void shareAndClaim(true)} disabled={claiming}>已手动复制，领取优惠</button>
            </div>}
          </div>
        )}

        <button
          type="button"
          className="btn btn-block"
          style={{ marginTop: "1rem" }}
          onClick={pay}
          disabled={busy}
        >
          {busy ? "处理中…" : `支付 ¥${yuan(quote.amount)} 解锁全部`}
        </button>

        {message && (
          <p className="small" role="status" style={{ margin: "0.75rem 0 0" }}>
            {message}
          </p>
        )}
        {guidance && <p className="notice" style={{ marginTop: "0.75rem" }}>{guidance}</p>}

        <Link className="share-text-button" href="/retrieve">找回已购报告 →</Link>
        <p className="small muted" style={{ margin: "0.875rem 0 0" }}>
          {paywall.refundNote}
        </p>
      </div>
    </section>
  );
}
