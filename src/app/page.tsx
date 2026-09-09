import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SceneIllustration } from "@/components/SceneIllustration";
import { StepFlow } from "@/components/StepFlow";
import { TypeArt, toneFor } from "@/components/TypeArt";
import { TypeSpectrum } from "@/components/Spectrum";
import { TypeStrip } from "@/components/TypeStrip";
import { listPublishedPacks, listResultCodes } from "@/lib/content";
import { absolute, breadcrumbSchema } from "@/lib/seo";
import illustrations from "../../content/illustrations.json";

export const metadata: Metadata = {
  alternates: { canonical: absolute("/") },
};

/** 类型卡缩略用的示例类型码。只是让用户先看到结果长什么样，不暗示这个类型更好。 */
const SAMPLE_CODE = "INFJ";

export default function HomePage() {
  const packs = listPublishedPacks();
  const lead = packs[0];
  const home = illustrations.home;
  const sample = lead?.results[SAMPLE_CODE];
  const tone = toneFor(SAMPLE_CODE);

  return (
    <>
      {/* 头部在 .page 之外，才能出血到整宽并吃掉刘海高度 */}
      <SiteHeader title="16型人格测试" brand action={{ label: "找回报告", href: "/retrieve" }} />
      <main className="page illustrated-page illustrated-page--home">
        <JsonLd data={breadcrumbSchema([{ name: "首页", path: "/" }])} />
        <div className="stack" style={{ "--stack-gap": "1.625rem" } as React.CSSProperties}>
          {/* 首屏：一张卡讲清这是什么测试，一个按钮开始 */}
          <section className="scene-hero">
            <SceneIllustration scene={illustrations.placements.homeHero} className="scene-hero-art" priority />
            <div className="scene-hero-copy stack" style={{ "--stack-gap": "0.625rem" } as React.CSSProperties}>
              <p className="eyebrow">{home.eyebrow}</p>
              <h1 className="h1">{home.title}</h1>
              <p className="muted small" style={{ margin: 0 }}>{home.description}</p>
              {lead && (
                <Link className="btn btn-block" href={`/t/${lead.meta.slug}/quiz`} style={{ marginTop: "0.375rem" }}>
                  开始测试
                </Link>
              )}
              <p className="small muted" style={{ margin: 0, textAlign: "center" }}>{home.startHint}</p>
            </div>
          </section>

          {lead && (
            <div className="facts">
              <span className="fact">
                <Icon name="list" size={20} />
                <b>{lead.meta.questionCount}</b>
                <span>道题</span>
              </span>
              <span className="fact">
                <Icon name="clock" size={20} />
                <b>{lead.meta.estimatedMinutes}</b>
                <span>分钟</span>
              </span>
              <span className="fact">
                <Icon name="check" size={20} />
                <b>免费</b>
                <span>出结果</span>
              </span>
            </div>
          )}

          {/*
           * 一共三步。
           *
           * 冷启动来的用户最想知道的是「要花多久、免费到哪儿、什么时候要掏钱」，
           * 这三件事原来散在页面各处，得读完才拼得出来。排成三步之后不读也看得见。
           */}
          <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <div className="stack" style={{ "--stack-gap": "0.25rem" } as React.CSSProperties}>
              <h2 className="h2">{home.stepsTitle}</h2>
              <p className="small muted" style={{ margin: 0 }}>{home.stepsHint}</p>
            </div>
            <StepFlow steps={home.steps} />
          </section>

          {/* 测完拿到什么。先让用户看见结果的样子，再决定要不要花 8 分钟 */}
          {lead && sample && (
            <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
              <div className="stack" style={{ "--stack-gap": "0.25rem" } as React.CSSProperties}>
                <h2 className="h2">{home.getsTitle}</h2>
                <p className="small muted" style={{ margin: 0 }}>{home.getsHint}</p>
              </div>
              <div className="gets">
                <div
                  className="gets-card"
                  style={{ background: tone.card, color: tone.ink } as React.CSSProperties}
                >
                  <div className="gets-card-art">
                    <TypeArt code={SAMPLE_CODE} fluid />
                  </div>
                  <p className="gets-card-label" style={{ color: tone.deep }}>{lead.meta.name}</p>
                  <p className="gets-card-code">{SAMPLE_CODE}</p>
                  <p className="gets-card-name">{sample.name}</p>
                  <p className="wrap gets-card-chips">
                    {sample.keywords.slice(0, 2).map((k) => (
                      <span className="chip" key={k}>{k}</span>
                    ))}
                  </p>
                </div>
                <div className="gets-body stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
                  {home.gets.map((item) => (
                    <div key={item.title} className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/*
               * 「四条维度位置」这句话本身说不清那是什么样子，所以直接画一条出来。
               * 用的是示意位置，光谱组件自己会标明这一点，不会被当成谁的作答。
               */}
              <div className="card home-axes">
                <TypeSpectrum
                  dimensions={lead.scoring.dimensions}
                  code={SAMPLE_CODE}
                  codeOrder={lead.scoring.codeOrder ?? lead.scoring.dimensions.map((d) => d.id)}
                />
                <p className="small muted home-axes-note">{home.spectrumNote}</p>
              </div>
            </section>
          )}

          {/* 四条轴分别在问什么。文案与插画都来自内容包 */}
          <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <div className="stack" style={{ "--stack-gap": "0.25rem" } as React.CSSProperties}>
              <h2 className="h2">{home.anglesTitle}</h2>
              <p className="small muted" style={{ margin: 0 }}>{home.anglesHint}</p>
            </div>
            <div className="angles">
              {home.angles.map((angle) => (
                <article className="angle" key={angle.axis}>
                  <SceneIllustration scene={angle.scene} className="angle-art" />
                  <p className="angle-axis">{angle.axis}</p>
                  <h3>{angle.title}</h3>
                  <p>{angle.description}</p>
                </article>
              ))}
            </div>
            {lead && (
              <Link className="btn btn-ghost btn-block" href={`/t/${lead.meta.slug}`}>
                {home.lettersCta}
              </Link>
            )}
          </section>

          {/* 16 张主视觉先摆出来。原来这里只有一句「16 种组合」，用户看不到东西 */}
          {lead && (
            <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
              <div className="stack" style={{ "--stack-gap": "0.25rem" } as React.CSSProperties}>
                <h2 className="h2">{home.gallery}</h2>
                <p className="small muted" style={{ margin: 0 }}>{home.galleryHint}</p>
              </div>
              <TypeStrip slug={lead.meta.slug} codes={listResultCodes(lead)} label={home.gallery} />
              <Link className="btn btn-ghost btn-block" href={`/t/${lead.meta.slug}/type`}>
                {home.galleryCta}
              </Link>
            </section>
          )}

          {packs.length === 0 && <p className="muted">还没有已发布的测试。</p>}

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
