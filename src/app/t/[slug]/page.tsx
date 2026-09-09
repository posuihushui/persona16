import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/Faq";
import { Icon, SectionHead } from "@/components/Icon";
import { SampleQuestion } from "@/components/SampleQuestion";
import { JsonLd } from "@/components/JsonLd";
import { LetterBreakdown } from "@/components/LetterBreakdown";
import { DimensionAxes } from "@/components/Spectrum";
import { SceneIllustration } from "@/components/SceneIllustration";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackView } from "@/components/TrackView";
import { TypeGrid } from "@/components/TypeGrid";
import { listResultCodes, listTestSlugs, loadPack } from "@/lib/content";
import { absolute, breadcrumbSchema, faqSchema, quizSchema } from "@/lib/seo";
import illustrations from "../../../../content/illustrations.json";

/**
 * 测试介绍页。
 *
 * 排版原则：首屏只放标题、三个数字和开始按钮，用户不需要读完任何一段文字
 * 就能开始。往下依次是图形化的维度轴和类型矩阵，长文本一律折叠。
 * 折叠用原生 details，内容仍在 HTML 里，搜索和 AI 抓得到。
 */

/** 拆解图的示例类型码。只是举例说明字母怎么拼，不暗示这个类型更好。 */
const SAMPLE_CODE = "INFJ";

export function generateStaticParams() {
  return listTestSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const pack = loadPack(slug);
    return {
      title: pack.meta.seo.title,
      description: pack.meta.seo.description,
      keywords: pack.meta.seo.keywords,
      alternates: { canonical: absolute(`/t/${slug}`) },
      openGraph: {
        type: "website",
        title: pack.meta.seo.title,
        description: pack.meta.seo.description,
        url: absolute(`/t/${slug}`),
      },
    };
  } catch {
    return { title: "测试不存在" };
  }
}

export default async function TestIntroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let pack;
  try {
    pack = loadPack(slug);
  } catch {
    notFound();
  }
  if (pack.meta.status !== "published") notFound();

  /*
   * 示例题取题库正中间那一道，不是第一道——第一道用户点「开始测试」马上会再见到一次。
   * 取值方式只和题目数量有关，换内容包不用改这里。
   */
  const questions = pack.questions.questions;
  const sample = questions[Math.floor(questions.length / 2)];
  const sampleDimension =
    pack.scoring.dimensions.find((d) => d.id === sample?.dimension)?.name ?? "";
  const sampleAxisCount = sample
    ? questions.filter((q) => q.dimension === sample.dimension).length
    : 0;

  return (
    <>
      <SiteHeader title={pack.meta.name} backHref="/" action={{ label: "找回报告", href: "/retrieve" }} />
      <main className="page illustrated-page illustrated-page--intro">
        <TrackView name="landing_view" slug={slug} />
        <JsonLd
          data={[
            quizSchema(pack),
            faqSchema(pack.meta.seo.faq),
            breadcrumbSchema([
              { name: "首页", path: "/" },
              { name: pack.meta.name, path: `/t/${slug}` },
            ]),
          ]}
        />

        <div className="stack" style={{ "--stack-gap": "1.75rem" } as React.CSSProperties}>
          {/* 首屏：一张大图加一句话，不需要读完整段落就能开始 */}
          <section className="scene-hero">
            <SceneIllustration scene={illustrations.placements.introHero} className="scene-hero-art" priority />
            <div className="scene-hero-copy">
              <p className="poster-eyebrow">{illustrations.intro.eyebrow}</p>
              <h1 className="cover-title">{pack.meta.name}</h1>
              <hr className="poster-rule" />
              <p className="cover-tagline">{pack.meta.tagline}</p>
            </div>
          </section>

          <div className="facts">
            <span className="fact">
              <Icon name="list" size={20} />
              <b>{pack.meta.questionCount}</b>
              <span>道题</span>
            </span>
            <span className="fact">
              <Icon name="clock" size={20} />
              <b>{pack.meta.estimatedMinutes}</b>
              <span>分钟</span>
            </span>
            <span className="fact">
              <Icon name="check" size={20} />
              <b>免费</b>
              <span>出结果</span>
            </span>
          </div>

          <Link className="btn btn-block" href={`/t/${slug}/quiz`}>
            开始测试
          </Link>

          {/*
           * 先试一题。
           *
           * 这一页唯一的任务是把人送进答题，而挡在前面的是「题目难不难、要想多久」。
           * 写多少字都不如让用户点一下，所以放一道真题和真实的五档量表。
           * 它不计分也不存进度，选完只给一句说明。
           */}
          {sample && (
            <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
              <SectionHead icon="check" title={illustrations.intro.sampleTitle} hint={illustrations.intro.sampleHintTop} />
              <SampleQuestion
                question={sample}
                options={pack.questions.scale.options}
                dimensionName={sampleDimension}
                eyebrow={illustrations.intro.sampleEyebrow}
                hint={illustrations.intro.sampleHint}
                feedback={illustrations.intro.sampleFeedback.replace("{count}", String(sampleAxisCount))}
                reset={illustrations.intro.sampleReset}
              />
            </section>
          )}

          {/* 四条轴只讲刻度：这个测试量的是位置，不是分数 */}
          <section className="card stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
            <SectionHead
              icon="layers"
              title={illustrations.intro.dimensionsTitle}
              hint={illustrations.intro.dimensionsHint}
            />
            <DimensionAxes dimensions={pack.scoring.dimensions} compact />
            <p className="spectrum-footnote">{illustrations.intro.dimensionsFootnote}</p>
          </section>

          {/* 光谱轴说的是「偏多少」，这一块说的是「四个字母怎么拼出来」 */}
          <section className="card stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
            <SectionHead
              icon="layers"
              title={illustrations.intro.lettersTitle}
              hint={illustrations.intro.lettersHint.replace("{code}", SAMPLE_CODE)}
            />
            <LetterBreakdown code={SAMPLE_CODE} numbered showResult />
            <p className="small muted" style={{ margin: 0 }}>
              {illustrations.intro.lettersFootnote}
            </p>
          </section>

          {/* 类型矩阵取代扁平标签列表 */}
          <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <SectionHead icon="grid" title={illustrations.intro.typesTitle} hint={illustrations.intro.typesHint} />
            <TypeGrid pack={pack} />
            <Link className="btn btn-ghost btn-block" href={`/t/${slug}/type`}>
              看全部 16 种的完整解读
            </Link>
          </section>

          {/* 长文本折叠，但仍在 HTML 里，抓取器读得到 */}
          <details className="card faq-item">
            <summary className="h3">这个测试测的到底是什么</summary>
            <div
              className="stack"
              style={{ "--stack-gap": "0.875rem", marginTop: "0.875rem" } as React.CSSProperties}
            >
              <p className="small" style={{ margin: 0 }}>
                {pack.meta.description}
              </p>
              <p className="small" style={{ margin: 0, whiteSpace: "pre-line" }}>
                {pack.meta.about}
              </p>
            </div>
          </details>

          <Faq items={pack.meta.seo.faq} />

          <div className="notice">{pack.meta.disclaimer}</div>

          <SiteFooter
            slug={slug}
            codes={listResultCodes(pack)}
            cta={{ label: `开始测试，约 ${pack.meta.estimatedMinutes} 分钟`, href: `/t/${slug}/quiz` }}
          />
        </div>
      </main>
    </>
  );
}
