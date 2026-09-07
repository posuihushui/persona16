import { readOpenId } from "@/lib/wechat/identity";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SectionHead } from "@/components/Icon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SceneSectionHeading } from "@/components/SceneIllustration";
import { TrackView } from "@/components/TrackView";
import { listResultCodes, loadPack } from "@/lib/content";
import { prisma } from "@/lib/db";
import { hasPaidAccess } from "@/lib/entitlement";
import { syncOrderStatus } from "@/lib/pay/reconcile";
import { readSessionKey } from "@/lib/session";
import illustrations from "../../../../../content/illustrations.json";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * 付费深度报告。鉴权在服务端做，未付费用户的 HTML 里不会出现任何付费内容。
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
    select: { id: true, slug: true, code: true, packVersion: true },
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

  return (
    <>
      <SiteHeader title="深度报告" backHref={`/r/${attempt.id}`} />
      <main className="page" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
        <TrackView name="report_view" slug={attempt.slug} attemptId={attempt.id} />

        <div className="stack" style={{ "--stack-gap": "2rem" } as React.CSSProperties}>
          <div className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
            <p className="eyebrow">{doc.code} · {doc.name}</p>
            <h1 className="h1">{pack.paywall.productName}</h1>
          </div>

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.reportCognition}>
              <SectionHead icon="layers" title="你的认知偏好是怎么组合的" />
            </SceneSectionHeading>
            <p style={{ margin: 0, whiteSpace: "pre-line" }}>{doc.cognition}</p>
          </section>

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SectionHead icon="spark" title="你的真实优势" />
            <ul className="stack" style={{ "--stack-gap": "0.5rem", margin: 0, paddingLeft: "1.1rem" } as React.CSSProperties}>
              {doc.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
            <SectionHead
              icon="eye"
              title="你的盲点，以及可以怎么办"
              hint="这些是倾向不是缺陷，每条都配了一个这周就能做的动作"
            />
            {doc.blindSpots.map((bs) => (
              <div key={bs.point} className="card stack" style={{ "--stack-gap": "0.625rem" } as React.CSSProperties}>
                <p style={{ margin: 0 }}>{bs.point}</p>
                <p className="small" style={{ margin: 0, color: "var(--accent-strong)" }}>
                  试试看：{bs.action}
                </p>
              </div>
            ))}
          </section>

          <section className="stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.reportCareer}>
              <SectionHead icon="grid" title="工作环境" />
            </SceneSectionHeading>
            <div className="versus">
              <div className="versus-col is-good">
                <h3>让你回血的</h3>
                <ul>
                  {doc.career.fits.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="versus-col is-bad">
                <h3>让你持续消耗的</h3>
                <ul>
                  {doc.career.drains.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <h3 className="h3">可以切入的方向</h3>
              <p className="wrap" style={{ margin: 0 }}>
                {doc.career.roles.map((r) => (
                  <span
                    key={r}
                    className="chip"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                  >
                    {r}
                  </span>
                ))}
              </p>
              <p className="small muted" style={{ margin: 0 }}>
                这是环境匹配度的参考，不是能力评价。同一个类型在任何行业都有做得很好的人。
              </p>
            </div>
          </section>

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.reportRelationships}>
              <SectionHead icon="link" title="亲密关系" />
            </SceneSectionHeading>
            <div className="card stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <h3 className="h3">你在关系里的样子</h3>
              <p style={{ margin: 0 }}>{doc.relationship.inLove}</p>
            </div>
            <div className="card stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <h3 className="h3">最容易反复出现的摩擦</h3>
              <p style={{ margin: 0 }}>{doc.relationship.friction}</p>
            </div>
          </section>

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SectionHead icon="share" title="和这几类人相处" />
            {doc.withOthers.map((item) => {
              const other = pack.results[item.code];
              return (
                <div key={item.code} className="card stack" style={{ "--stack-gap": "0.375rem" } as React.CSSProperties}>
                  <h3 className="h3">
                    {item.code}
                    {other ? ` ${other.name}` : ""}
                  </h3>
                  <p className="small" style={{ margin: 0 }}>{item.note}</p>
                </div>
              );
            })}
          </section>

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.reportGrowth}>
              <SectionHead icon="steps" title="给你的三条成长建议" />
            </SceneSectionHeading>
            <ol className="numbered">
              {doc.growth.map((g) => (
                <li key={g}>
                  <span>{g}</span>
                </li>
              ))}
            </ol>
          </section>

          <hr className="divider" />

          {order?.retrieveCode && (
            <div className="card stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <h3 className="h3">换设备也能找回</h3>
              <p className="small" style={{ margin: 0 }}>
                你的找回码是 <strong style={{ letterSpacing: "0.08em" }}>{order.retrieveCode}</strong>
                ，截图存好。换手机或清了缓存之后，在找回页输入它就能重新打开这份报告。
              </p>
              <Link className="btn btn-ghost" href="/retrieve">
                去找回页看看
              </Link>
            </div>
          )}

          <Link className="btn btn-ghost btn-block" href={`/r/${attempt.id}`}>
            回到结果页
          </Link>

          <div className="notice">{pack.meta.disclaimer}</div>

          <SiteFooter slug={attempt.slug} codes={listResultCodes(pack)} />
        </div>
      </main>
    </>
  );
}
