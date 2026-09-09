import { cache } from "react";
import ui from "../../../../content/ui.json";
import illustrations from "../../../../content/illustrations.json";
import { readOpenId } from "@/lib/wechat/identity";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterCards } from "@/components/ChapterCards";
import { Checkout } from "@/components/Checkout";
import { ReportSkeleton } from "@/components/ReportSkeleton";
import { SectionHead } from "@/components/Icon";
import { LockedPreview } from "@/components/LockedPreview";
import { ScoreSpectrum } from "@/components/Spectrum";
import { TypePoster } from "@/components/TypePoster";
import { ShareBar } from "@/components/ShareBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SceneIllustration, SceneSectionHeading, illustrationFor } from "@/components/SceneIllustration";
import { TrackView } from "@/components/TrackView";
import { freeView, listResultCodes, loadPack } from "@/lib/content";
import { posterAxes } from "@/lib/poster";
import { prisma } from "@/lib/db";
import { hasPaidAccess } from "@/lib/entitlement";
import { claimDiscount, quote } from "@/lib/pricing";
import { absolute, siteUrl } from "@/lib/seo";
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
  const reportIllustration = illustrationFor(illustrations.placements.resultReport);

  // 公开解读是免费字段。挑出带对照栏的那一节，未付费时直接展示在结果页
  const chapters = doc.guide ?? [];
  const freeVersus = chapters.find((chapter) => chapter.good && chapter.hard);

  /*
   * 海报卡上的四条轴。用户截首屏那一张就够了，不用再截光谱那一块。
   * 模型和分享卡共用同一个文件，两边不会各算各的。
   */
  const posterAxisRows = posterAxes(pack.scoring.dimensions, dimensions);

  return (
    <>
      <SiteHeader title="我的结果" backHref="/" action={{ label: "找回报告", href: "/retrieve" }} />
      <main className="page result-page">
        <TrackView name="result_view" slug={attempt.slug} attemptId={attempt.id} />

        <div className="stack" style={{ "--stack-gap": "1.75rem" } as React.CSSProperties}>
          {/* 首屏就是用户会截图的那张卡 */}
          <TypePoster
            code={doc.code}
            doc={doc}
            testName={ui.result.posterEyebrow}
            stamp={pack.meta.name}
            heading
            axes={posterAxisRows}
            creedLabel={ui.share.creedLabel}
            host={new URL(siteUrl()).host}
          />
          <p className="small muted poster-hint">{ui.result.posterHint}</p>
          <ShareBar attemptId={attempt.id} slug={attempt.slug} code={attempt.code} version={attempt.packVersion} label={doc.label} />

          {/* 得分先给图。用户看维度位置比看文字快得多 */}
          <section className="card stack" style={{ "--stack-gap": "1.25rem" } as React.CSSProperties}>
            <SectionHead icon="layers" title={ui.result.axesTitle} hint={ui.result.axesHint} />
            <ScoreSpectrum
              dimensions={pack.scoring.dimensions}
              scores={dimensions}
              summaryLabel={ui.result.axesSummary}
            />
          </section>

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.resultCore}>
              <h2 className="h2">{ui.result.coreTitle}</h2>
            </SceneSectionHeading>
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

          {/*
           * 未付费时这一页原来只剩一张卡、四条轴和 62 字预览，薄得像还没加载完。
           * 但这个类型的公开解读本来就免费，只是全躺在类型页上。
           * 把其中的对照栏搬过来，再给出其余几节的入口——不复制正文，正文只有一份。
           */}
          {!paid && freeVersus && (
            <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
              <SectionHead icon="spark" title={ui.result.freeGuideTitle} hint={ui.result.freeGuideHint} />
              <div className="versus">
                <div className="versus-col is-good">
                  <h3>{freeVersus.goodTitle ?? "长处"}</h3>
                  <ul>
                    {freeVersus.good?.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="versus-col is-bad">
                  <h3>{freeVersus.hardTitle ?? "难处"}</h3>
                  <ul>
                    {freeVersus.hard?.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {!paid && chapters.length > 0 && (
            <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
              <SectionHead icon="list" title={ui.result.chaptersTitle} hint={ui.result.chaptersHint} />
              <ChapterCards
                chapters={chapters}
                href={`/t/${attempt.slug}/type/${attempt.code}`}
              />
            </section>
          )}


          <hr className="divider" />

          {reportIllustration && (
            <div className="scene-note">
              <SceneIllustration scene={illustrations.placements.resultReport} className="scene-note-art" />
              <div className="scene-note-copy stack" style={{ "--stack-gap": "0.375rem" } as React.CSSProperties}>
                <h2 className="h3">{reportIllustration.title}</h2>
                <p className="small muted" style={{ margin: 0 }}>{reportIllustration.description}</p>
              </div>
            </div>
          )}

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
              {/* 报告长什么样，画骨架比写承诺直观。里面没有一个字是正文 */}
              <ReportSkeleton caption={ui.checkout.skeletonCaption} />
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

          <SiteFooter
            slug={attempt.slug}
            codes={listResultCodes(pack)}
            cta={{ label: "再测一次", href: `/t/${attempt.slug}/quiz` }}
          />
        </div>
      </main>
    </>
  );
}
