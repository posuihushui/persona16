import { cache } from "react";
import ui from "../../../../content/ui.json";
import { readOpenId } from "@/lib/wechat/identity";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { SectionHead } from "@/components/Icon";
import { LockedPreview } from "@/components/LockedPreview";
import { ScoreSpectrum } from "@/components/Spectrum";
import { TypePoster } from "@/components/TypePoster";
import { ShareBar } from "@/components/ShareBar";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackView } from "@/components/TrackView";
import { freeView, loadPack } from "@/lib/content";
import { prisma } from "@/lib/db";
import { hasPaidAccess } from "@/lib/entitlement";
import { claimDiscount, quote } from "@/lib/pricing";
import { absolute } from "@/lib/seo";
import { readSessionKey } from "@/lib/session";
import type { DimensionScore } from "@/lib/types";

export const dynamic = "force-dynamic";

const loadAttempt = cache(async (id: string) => {
  const attempt = await prisma.attempt.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true, code: true, dimensions: true, packVersion: true },
  });
  if (!attempt) return null;
  return attempt;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ resultId: string }>;
}): Promise<Metadata> {
  const { resultId } = await params;
  const attempt = await loadAttempt(resultId);
  if (!attempt) return { title: "结果不存在", robots: { index: false, follow: false } };

  const pack = loadPack(attempt.slug, attempt.packVersion);
  const doc = pack.results[attempt.code];
  if (!doc) return { title: pack.meta.name, robots: { index: false, follow: false } };

  const title = `${attempt.code} ${doc.name} · ${pack.meta.name}`;
  return {
    title,
    description: doc.label,
    // 个人结果页不索引，权重集中到 /t/<slug>/type/<code> 的类型解读页
    robots: { index: false, follow: true },
    alternates: { canonical: absolute(`/t/${attempt.slug}/type/${attempt.code}`) },
    openGraph: {
      title,
      description: doc.label,
      images: [`/api/og?slug=${attempt.slug}&code=${attempt.code}&version=${attempt.packVersion}`],
    },
  };
}

export default async function ResultPage({ params }: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await params;
  const attempt = await loadAttempt(resultId);
  if (!attempt) notFound();

  const pack = loadPack(attempt.slug, attempt.packVersion);
  const doc = pack.results[attempt.code];
  if (!doc) notFound();

  const dimensions = attempt.dimensions as unknown as DimensionScore[];
  const sessionKey = await readSessionKey();
  const openId = await readOpenId();
  const paid = await hasPaidAccess(attempt.id, { sessionKey, openId });

  // 未付费时只把免费字段和一段预览渲染进 HTML，付费正文根本不进页面
  const view = paid ? null : freeView(doc, pack.paywall);

  // 纯限时促销不需要用户做任何动作，第一次看到结果就发券。
  // share 模式下必须由用户主动分享才发，这里不发。
  if (!paid && sessionKey && pack.paywall.discount?.trigger === "timed") {
    await claimDiscount(attempt.id, { sessionKey, openId }, pack.paywall);
  }

  // 价格在服务端算好后传给付款界面，客户端不参与定价
  const priced =
    paid || !sessionKey
      ? null
      : await quote(attempt.id, { sessionKey, openId }, pack.paywall);

  return (
    <main className="page result-page">
      <TrackView name="result_view" slug={attempt.slug} attemptId={attempt.id} />

      <div className="stack" style={{ "--stack-gap": "1.75rem" } as React.CSSProperties}>
        {/* 首屏就是用户会截图的那张卡 */}
        <TypePoster code={doc.code} doc={doc} testName={pack.meta.name} compact heading />
        <ShareBar attemptId={attempt.id} slug={attempt.slug} code={attempt.code} version={attempt.packVersion} label={doc.label} />

        {/* 得分先给图。用户看维度位置比看文字快得多 */}
        <section className="card stack" style={{ "--stack-gap": "1.25rem" } as React.CSSProperties}>
          <SectionHead icon="layers" title={ui.result.axesTitle} hint={ui.result.axesHint} />
          <ScoreSpectrum dimensions={pack.scoring.dimensions} scores={dimensions} />
        </section>

        <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
          <h2 className="h2">{ui.result.coreTitle}</h2>
          {paid ? (
            <p style={{ margin: 0, whiteSpace: "pre-line" }}>{doc.core}</p>
          ) : (
            <LockedPreview teaser={view?.teaser ?? ""} remaining={view?.teaserRemaining} />
          )}
        </section>

        {paid && (
          <div className="versus">
            <div className="versus-col is-good">
              <h3>{ui.result.atBest}</h3>
              <p className="small" style={{ margin: 0 }}>{doc.atBest}</p>
            </div>
            <div className="versus-col is-bad">
              <h3>{ui.result.atWorst}</h3>
              <p className="small" style={{ margin: 0 }}>{doc.atWorst}</p>
            </div>
          </div>
        )}


        <hr className="divider" />

        {paid ? (
          <>
            <Link className="btn btn-block" href={`/r/${attempt.id}/report`}>
              查看你的深度报告
            </Link>
            <Link className="small" href={`/t/${attempt.slug}/type/${attempt.code}`}>
              查看 {attempt.code} 这个类型的完整解读 →
            </Link>
          </>
        ) : (
          <>
            <TrackView name="paywall_view" slug={attempt.slug} attemptId={attempt.id} />
            {priced && (
              <Checkout
                attemptId={attempt.id}
                slug={attempt.slug}
                code={attempt.code}
                paywall={pack.paywall}
                quote={{
                  amount: priced.amount,
                  listAmount: priced.listAmount,
                  originalAmount: priced.originalAmount,
                  discount: priced.discount
                    ? {
                        percent: priced.discount.percent,
                        expiresAt: priced.discount.expiresAt.toISOString(),
                      }
                    : null,
                }}
              />
            )}
          </>
        )}

        <div className="notice">{pack.meta.disclaimer}</div>

        <p className="small muted" style={{ margin: 0 }}>
          {ui.result.versionNote.replace("{version}", attempt.packVersion)}
        </p>

        <SiteFooter />
      </div>
    </main>
  );
}
