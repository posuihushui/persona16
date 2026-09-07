import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SceneIllustration, illustrationFor } from "@/components/SceneIllustration";
import { listPublishedPacks, listResultCodes } from "@/lib/content";
import { absolute, breadcrumbSchema } from "@/lib/seo";
import illustrations from "../../content/illustrations.json";

export const metadata: Metadata = {
  alternates: { canonical: absolute("/") },
};

export default function HomePage() {
  const packs = listPublishedPacks();
  const lead = packs[0];

  return (
    <>
      {/* 头部在 .page 之外，才能出血到整宽并吃掉刘海高度 */}
      <SiteHeader title="16型人格测试" brand action={{ label: "找回报告", href: "/retrieve" }} />
      <main className="page illustrated-page illustrated-page--home">
        <JsonLd data={breadcrumbSchema([{ name: "首页", path: "/" }])} />
        <div className="stack" style={{ "--stack-gap": "1.5rem" } as React.CSSProperties}>
          <section className="scene-hero">
            <SceneIllustration scene={illustrations.placements.homeHero} className="scene-hero-art" priority />
            <div className="scene-hero-copy stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
              <p className="eyebrow">{illustrations.home.eyebrow}</p>
              <h1 className="h1">{illustrations.home.title}</h1>
              <p className="muted">{illustrations.home.description}</p>
              {packs[0] && <Link className="btn btn-block" href={`/t/${packs[0].meta.slug}/quiz`}>开始测试</Link>}
            </div>
          </section>

          <div className="stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
            {packs.map((pack) => (
              <Link key={pack.meta.slug} href={`/t/${pack.meta.slug}`} className="card scene-card scene-card--horizontal">
                <SceneIllustration scene={illustrations.placements.homeTest} className="scene-card-art" />
                <div className="scene-card-body stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
                  <h2 className="h2">{pack.meta.name}</h2>
                  <p className="muted small" style={{ margin: 0 }}>{pack.meta.tagline}</p>
                  <p className="small" style={{ color: "var(--accent-strong)", margin: 0 }}>
                    {pack.meta.questionCount} 题 · 约 {pack.meta.estimatedMinutes} 分钟 · 免费出结果
                  </p>
                </div>
              </Link>
            ))}
            {packs.length === 0 && <p className="muted">还没有已发布的测试。</p>}
          </div>

          <section className="stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
            <div className="stack" style={{ "--stack-gap": "0.375rem" } as React.CSSProperties}>
              <h2 className="h2">{illustrations.home.exploreTitle}</h2>
              <p className="small muted" style={{ margin: 0 }}>{illustrations.home.exploreHint}</p>
            </div>
            <div className="scene-card-grid">
              {illustrations.placements.homeBenefits.map((scene) => {
                const asset = illustrationFor(scene);
                if (!asset) return null;
                return (
                  <article className="scene-card" key={scene}>
                    <SceneIllustration scene={scene} className="scene-card-art" />
                    <div className="scene-card-body stack" style={{ "--stack-gap": "0.375rem" } as React.CSSProperties}>
                      <h3 className="h3">{asset.title}</h3>
                      <p className="small muted" style={{ margin: 0 }}>{asset.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="notice">
            这里的测试是自我认知参考工具，不是心理诊断，也不构成医学建议。
            如果你正被持续的情绪困扰影响生活，请联系专业心理服务或拨打全国心理援助热线 12356。
          </div>

          <SiteFooter
            slug={lead?.meta.slug}
            codes={lead ? listResultCodes(lead) : undefined}
            cta={
              lead
                ? { label: `开始测试，约 ${lead.meta.estimatedMinutes} 分钟`, href: `/t/${lead.meta.slug}/quiz` }
                : null
            }
          />
        </div>
      </main>
    </>
  );
}
