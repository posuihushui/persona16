import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { findAttemptByRetrieveCode } from "@/lib/entitlement";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "找回我的报告",
  robots: { index: false, follow: true },
};

/**
 * 付费后换设备、清缓存都必须能找回报告。
 * 付费内容丢失是信任事故，不是客服问题（agents.md 原则 9）。
 */
export default async function RetrievePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const trimmed = code?.trim().toUpperCase();
  const attemptId = trimmed ? await findAttemptByRetrieveCode(trimmed) : null;

  return (
    <main className="page" style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
      <div className="stack" style={{ "--stack-gap": "1.5rem" } as React.CSSProperties}>
        <div className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h1 className="h1">找回我的报告</h1>
          <p className="muted">
            输入你付费后拿到的找回码。它印在报告底部，形如 ABCD-EFGH。
          </p>
        </div>

        <form className="stack card" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties} method="GET">
          <label className="small" htmlFor="code">
            找回码
          </label>
          <input
            id="code"
            name="code"
            defaultValue={trimmed ?? ""}
            placeholder="ABCD-EFGH"
            className="field"
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
          />
          <button type="submit" className="btn btn-block">
            找回报告
          </button>
        </form>

        {trimmed && attemptId && (
          <div className="card stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <p style={{ margin: 0 }}>找到了，这份报告属于你。</p>
            <Link className="btn btn-block" href={`/r/${attemptId}/report?code=${trimmed}`}>
              打开深度报告
            </Link>
          </div>
        )}

        {trimmed && !attemptId && (
          <div className="notice">
            没有找到对应的已支付报告。请检查找回码是否输错，或者联系客服邮箱处理。
          </div>
        )}

        <SiteFooter />
      </div>
    </main>
  );
}
