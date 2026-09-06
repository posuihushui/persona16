"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
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
  const [left, setLeft] = useState<string | null>(() =>
    formatLeft(new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const tick = () => {
      const next = formatLeft(new Date(expiresAt).getTime() - Date.now());
      setLeft(next);
      if (next === null) onExpire();
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
        优惠还剩 <b>{left}</b>，过期恢复原价
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
  paywall,
  quote,
}: {
  attemptId: string;
  paywall: PaywallConfig;
  quote: QuoteView;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

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
  const shareAndClaim = async () => {
    setClaiming(true);
    setMessage(null);

    const url = `${window.location.origin}/r/${attemptId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
    } catch {
      window.prompt("复制这个链接分享给朋友", url);
      setShared(true);
    }

    try {
      const res = await fetch("/api/discount/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "优惠领取失败");
      }
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "优惠领取失败");
    } finally {
      setClaiming(false);
    }
  };

  const confirmPayment = async (orderId: string) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    setMessage("支付已提交，正在确认…");

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      try {
        const res = await fetch(`/api/order/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { paid: boolean };
          if (data.paid) {
            setMessage("支付成功，正在打开报告…");
            router.refresh();
            return;
          }
        }
      } catch {
        // 网络抖动继续重试
      }
    }

    setMessage("还没收到支付结果");
    setGuidance(
      "如果你已经付款成功，通常一分钟内到账。稍等一下刷新页面即可，重复付款不会发生，同一份报告只会收一次费。",
    );
    setBusy(false);
  };

  const pay = async () => {
    setBusy(true);
    setMessage(null);
    setGuidance(null);
    try {
      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = (await res.json()) as
        | { alreadyPaid: true; retrieveCode: string }
        | { orderId: string; retrieveCode: string; prepay: Prepay }
        | { prepay: Prepay }
        | { error: string };

      if ("error" in data) throw new Error(data.error);
      if ("alreadyPaid" in data) {
        router.refresh();
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
        return;
      }
      if (prepay.kind === "redirect" || prepay.kind === "mock") {
        window.location.href = prepay.url;
        return;
      }

      if (!window.WeixinJSBridge) {
        setMessage("微信支付组件还没准备好");
        setGuidance("请稍等一两秒再试，或者点右上角在浏览器中打开后继续。");
        setBusy(false);
        return;
      }

      const orderId = "orderId" in data ? data.orderId : null;
      window.WeixinJSBridge.invoke("getBrandWCPayRequest", prepay.params, (result) => {
        if (result.err_msg === "get_brand_wcpay_request:ok" && orderId) {
          void confirmPayment(orderId);
        } else if (result.err_msg === "get_brand_wcpay_request:cancel") {
          setMessage("已取消支付");
          setBusy(false);
        } else {
          setMessage("支付未完成");
          setGuidance("可以再试一次。如果反复失败，请换微信内打开或联系客服。");
          setBusy(false);
        }
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "下单失败，请重试");
      setBusy(false);
    }
  };

  /** 60 写成「6 折」，65 写成「6.5 折」 */
  const asOff = (percent: number) => (percent / 10).toFixed(percent % 10 ? 1 : 0);
  const offLabel = active ? `${asOff(active.percent)} 折` : null;

  return (
    <section className="checkout">
      <div className="checkout-head">
        <h2 className="checkout-title">{paywall.productName}</h2>
        <p className="checkout-sub">下面这些内容解锁后一次看完，不分次收费</p>
      </div>

      <div className="checkout-body">
        <ul className="locked-list">
          {paywall.locked.map((item) => (
            <li key={item.key}>
              <Icon name="lock" size={17} />
              <span>
                <b>{item.title}</b>
                <span>{item.hint}</span>
              </span>
            </li>
          ))}
        </ul>

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
              把结果发给朋友，{discountConfig.windowHours} 小时内{" "}
              {asOff(discountConfig.percent)} 折
            </p>
            <p className="fission-hint">
              免费部分本来就完整可看，分享不改变这一点，只改变深度报告的价格。
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={shareAndClaim}
              disabled={claiming}
            >
              {claiming ? "处理中…" : shared ? "已复制链接，正在领取优惠…" : "复制链接并领取优惠"}
            </button>
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
          <p className="small" style={{ margin: "0.75rem 0 0" }}>
            {message}
          </p>
        )}
        {guidance && <p className="notice" style={{ marginTop: "0.75rem" }}>{guidance}</p>}

        <p className="small muted" style={{ margin: "0.875rem 0 0" }}>
          {paywall.refundNote}
        </p>
      </div>
    </section>
  );
}
