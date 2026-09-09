import { readOpenId } from "@/lib/wechat/identity";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionChecklist } from "@/components/ActionChecklist";
import { SectionHead } from "@/components/Icon";
import { PairCard } from "@/components/PairCard";
import { RankStack } from "@/components/RankStack";
import { ScoreSpectrum } from "@/components/Spectrum";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SceneSectionHeading } from "@/components/SceneIllustration";
import { TrackView } from "@/components/TrackView";
import { TypeGuideNav } from "@/components/TypeGuide";
import { TypePoster } from "@/components/TypePoster";
import { listResultCodes, loadPack } from "@/lib/content";
import { prisma } from "@/lib/db";
import { hasPaidAccess } from "@/lib/entitlement";
import { syncOrderStatus } from "@/lib/pay/reconcile";
import { paragraphs, splitClaim, splitLead } from "@/lib/prose";
import { readSessionKey } from "@/lib/session";
import type { DimensionScore } from "@/lib/types";
import ui from "../../../../../content/ui.json";
import illustrations from "../../../../../content/illustrations.json";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const copy = ui.report;

/**
 * 付费深度报告。鉴权在服务端做，未付费用户的 HTML 里不会出现任何付费内容。
 *
 * 这是全站文字最密的一页，所以排版按内容的形状分工，不用同一种块从头铺到尾：
 *   认知偏好本来就有次序 → 阶梯
 *   优势是五条并列结论   → 编号卡，结论加粗，解释降一级
 *   盲点是「看到的 + 做的」→ 双格卡，动作那格可以勾掉
 *   相处对象有两个类型码 → 双主视觉的配对卡
 * 顶上补一个封面和目录，八千字不再是一条没有路标的长路。
 */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ resultId: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { resultId } = await params;
  const { code: retrieveCode } = await searchParams;

  const attempt = await prisma.attempt.findFirst({
    where: { id: resultId, deletedAt: null },
    select: { id: true, slug: true, code: true, dimensions: true, packVersion: true },
  });
  if (!attempt) notFound();

  const sessionKey = await readSessionKey();
  const openId = await readOpenId();
  let paid = await hasPaidAccess(attempt.id, { sessionKey, openId, retrieveCode });

  // 微信 H5 支付会把用户直接跳回这里，此时回调可能还没到。
  // 先就本人的待支付订单主动查一次单，避免付了钱却被弹回结果页。
  if (!paid && sessionKey) {
    const pending = await prisma.order.findFirst({
      where: { attemptId: attempt.id, sessionKey, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (pending) {
      const synced = await syncOrderStatus(pending.id);
      paid = synced?.paid ?? false;
    }
  }

  if (!paid) redirect(`/r/${attempt.id}`);

  const pack = loadPack(attempt.slug, attempt.packVersion);
  const doc = pack.results[attempt.code];
  if (!doc) notFound();

  const order = await prisma.order.findFirst({
    where: { attemptId: attempt.id, status: "PAID" },
    select: { retrieveCode: true },
  });

  const dimensions = attempt.dimensions as unknown as DimensionScore[];
  // 认知那一段本来就是按启动顺序写的四段，摊开就能排成阶梯
  const cognition = paragraphs(doc.cognition);

  // 目录跟着实际渲染的小节走，顺序和下面一致
  const sections = [
    { id: "cognition", nav: copy.nav.cognition },
    { id: "strengths", nav: copy.nav.strengths },
    { id: "blind", nav: copy.nav.blind },
    { id: "career", nav: copy.nav.career },
    { id: "love", nav: copy.nav.love },
    { id: "others", nav: copy.nav.others },
    { id: "growth", nav: copy.nav.growth },
  ];

  return (
    <>
      <SiteHeader title="深度报告" backHref={`/r/${attempt.id}`} />
      <main className="page report-page">
        <TrackView name="report_view" slug={attempt.slug} attemptId={attempt.id} />

        {/*
         * 封面。报告原来的开头是一行小字加一个标题，读起来像文档而不像交付物。
         * 把类型卡和四条轴放到最前面，用户一打开就知道这份报告是给谁的，
         * 后面所有的「你」都挂在这张卡上。
         */}
        <header className="report-cover">
          <div className="report-cover-card">
            <TypePoster code={doc.code} doc={doc} testName={copy.coverEyebrow} compact />
          </div>
          <div className="report-cover-body">
            <h1 className="h1">{pack.paywall.productName}</h1>
            <p className="report-cover-axes">{copy.coverAxes}</p>
            <ScoreSpectrum dimensions={pack.scoring.dimensions} scores={dimensions} />
          </div>
        </header>

        <TypeGuideNav chapters={sections} />

        <div className="stack report-body" style={{ "--stack-gap": "2.25rem" } as React.CSSProperties}>
          <section id="cognition" className="report-section stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.reportCognition}>
              <SectionHead icon="layers" title={copy.cognitionTitle} hint={copy.cognitionHint} />
            </SceneSectionHeading>
            <RankStack items={cognition} note={copy.cognitionNote} />
          </section>

          <section id="strengths" className="report-section stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <SectionHead icon="spark" title={copy.strengthsTitle} hint={copy.strengthsHint} />
            {/*
             * 五条优势原来是一个项目符号列表，五行长得一样。
             * 每条写的其实是「结论，为什么」，把前半句提出来加粗，
             * 扫读的人只看粗体那一行也能读完这一节。拆不动的条目原样显示。
             */}
            <ol className="cards">
              {doc.strengths.map((item, i) => {
                const { lead, body } = splitLead(item);
                return (
                  <li className="card-item" key={item.slice(0, 16)}>
                    <span className="card-index" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="card-body">
                      <b>{lead}</b>
                      {body && <span>{body}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section id="blind" className="report-section stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <SectionHead icon="eye" title={copy.blindTitle} hint={copy.blindHint} />
            <ActionChecklist
              items={doc.blindSpots}
              storageKey={`p16:actions:${attempt.id}`}
              actionLabel={copy.blindAction}
              doneLabel={copy.blindDone}
            />
          </section>

          <section id="career" className="report-section stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.reportCareer}>
              <SectionHead icon="grid" title={copy.careerTitle} />
            </SceneSectionHeading>
            <div className="versus">
              <div className="versus-col is-good">
                <h3>{copy.careerFits}</h3>
                <ul>
                  {doc.career.fits.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="versus-col is-bad">
                <h3>{copy.careerDrains}</h3>
                <ul>
                  {doc.career.drains.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <h3 className="h3">{copy.careerRoles}</h3>
              {/* 六个方向从一排 chip 换成瓦片，每个方向有自己的位置 */}
              <ul className="roles">
                {doc.career.roles.map((r) => (
                  <li className="role" key={r}>
                    {r}
                  </li>
                ))}
              </ul>
              <p className="small muted" style={{ margin: 0 }}>
                {copy.careerNote}
              </p>
            </div>
          </section>

          <section id="love" className="report-section stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.reportRelationships}>
              <SectionHead icon="link" title={copy.loveTitle} />
            </SceneSectionHeading>
            <div className="card stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <h3 className="h3">{copy.loveIn}</h3>
              <p style={{ margin: 0 }}>{doc.relationship.inLove}</p>
            </div>
            <div className="card stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <h3 className="h3">{copy.loveFriction}</h3>
              <p style={{ margin: 0 }}>{doc.relationship.friction}</p>
            </div>
          </section>

          <section id="others" className="report-section stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SectionHead icon="share" title={copy.othersTitle} hint={copy.othersHint} />
            {/* 四张卡的左半边都是你，右半边换人，谁和谁不用再从文字里找 */}
            <div className="pairs">
              {doc.withOthers.map((item) => (
                <PairCard
                  key={item.code}
                  selfCode={doc.code}
                  otherCode={item.code}
                  otherName={pack.results[item.code]?.name}
                  note={item.note}
                  href={`/t/${attempt.slug}/type/${item.code}`}
                />
              ))}
            </div>
          </section>

          <section id="growth" className="report-section stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.reportGrowth}>
              <SectionHead icon="steps" title={copy.growthTitle} />
            </SceneSectionHeading>
            <ol className="cards cards--action">
              {doc.growth.map((item, i) => {
                const { lead, body } = splitClaim(item);
                return (
                  <li className="card-item" key={item.slice(0, 16)}>
                    <span className="card-index" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="card-body">
                      <b>{lead}</b>
                      {body && <span>{body}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <hr className="divider" />

          {order?.retrieveCode && (
            <div className="card stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <h3 className="h3">{copy.retrieveTitle}</h3>
              <p className="small" style={{ margin: 0 }}>
                {copy.retrieveHint.split("{code}")[0]}
                <strong style={{ letterSpacing: "0.08em" }}>{order.retrieveCode}</strong>
                {copy.retrieveHint.split("{code}")[1]}
              </p>
              <Link className="btn btn-ghost" href="/retrieve">
                {copy.retrieveCta}
              </Link>
            </div>
          )}

          <Link className="btn btn-ghost btn-block" href={`/r/${attempt.id}`}>
            {copy.back}
          </Link>

          <div className="notice">{pack.meta.disclaimer}</div>

          <SiteFooter slug={attempt.slug} codes={listResultCodes(pack)} />
        </div>
      </main>
    </>
  );
}
