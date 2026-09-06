import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/Faq";
import { Icon, SectionHead } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { DimensionAxes } from "@/components/Spectrum";
import { CoverArt } from "@/components/TypeArt";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackView } from "@/components/TrackView";
import { TypeGrid } from "@/components/TypeGrid";
import { listTestSlugs, loadPack } from "@/lib/content";
import { absolute, breadcrumbSchema, faqSchema, quizSchema } from "@/lib/seo";

/**
 * 测试介绍页。
 *
 * 排版原则：首屏只放标题、三个数字和开始按钮，用户不需要读完任何一段文字
 * 就能开始。往下依次是图形化的维度轴和类型矩阵，长文本一律折叠。
 * 折叠用原生 details，内容仍在 HTML 里，搜索和 AI 抓得到。
 */

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

  return (
    <main className="page" style={{ paddingTop: "2.5rem", paddingBottom: "2rem" }}>
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
        <section className="cover">
          <div className="cover-art">
            <CoverArt />
          </div>
          <div className="cover-body">
            <p className="poster-eyebrow">自我认知测试</p>
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

        <p className="small muted" style={{ margin: 0, textAlign: "center" }}>
          不用注册，不用分享，不用关注
        </p>

        {/* 图形优先：四条轴一眼看懂这个测试在量什么 */}
        <section className="card stack" style={{ "--stack-gap": "1.25rem" } as React.CSSProperties}>
          <SectionHead icon="layers" title="测的是四件事" hint="每件事你都会落在两端之间的某个位置，不是打分" />
          <DimensionAxes dimensions={pack.scoring.dimensions} compact />
        </section>

        {/* 类型矩阵取代扁平标签列表 */}
        <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
          <SectionHead icon="grid" title="四个维度组合出 16 种" hint="点开任意一种，先看看像不像你" />
          <TypeGrid pack={pack} />
          <Link className="btn btn-ghost btn-block" href={`/t/${slug}/type`}>
            看全部 16 种的完整解读
          </Link>
        </section>

        <section className="card stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
          <SectionHead icon="spark" title="测完你会拿到" />
          <ul
            className="stack small"
            style={{ "--stack-gap": "0.5rem", margin: 0 } as React.CSSProperties}
          >
            <li>你的类型码，和这个类型的一句话人设</li>
            <li>四条轴上你各自偏向哪边、偏多少</li>
            <li>你最舒服的状态，和你最容易累的状态</li>
          </ul>
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

        <SiteFooter />
      </div>
    </main>
  );
}
