import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/Faq";
import { LetterBreakdown } from "@/components/LetterBreakdown";
import { LockedPreview } from "@/components/LockedPreview";
import { SectionHead } from "@/components/Icon";
import { TypeSpectrum } from "@/components/Spectrum";
import { TypePoster } from "@/components/TypePoster";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SceneSectionHeading } from "@/components/SceneIllustration";
import { freeView, listPublishedPacks, listResultCodes, loadPack } from "@/lib/content";
import { absolute, breadcrumbSchema, faqSchema, typeArticleSchema } from "@/lib/seo";
import illustrations from "../../../../../../content/illustrations.json";

/**
 * 单个类型的解读页。
 *
 * 这是全站最重要的可索引内容：16 个静态页面，互相链接，覆盖用户真正会搜的词
 * （「INFP 是什么样的人」「ESTJ 适合什么工作」）。落地页也是运营投放的承接页，
 * 用户看完某个类型的短视频过来，接住的应该是这一页而不是首页。
 *
 * 只渲染免费字段。付费内容不出现在任何可索引页面里。
 */

export const dynamic = "force-static";

export function generateStaticParams() {
  return listPublishedPacks().flatMap((pack) =>
    listResultCodes(pack).map((code) => ({ slug: pack.meta.slug, code })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}): Promise<Metadata> {
  const { slug, code } = await params;
  try {
    const pack = loadPack(slug);
    const doc = pack.results[code];
    if (!doc) return { title: "类型不存在" };

    const title = `${doc.code} ${doc.name}是什么样的人？${doc.label}`;
    // 描述只用免费预览。meta 和结构化数据都是公开内容，不能从这里漏出付费正文
    const preview = freeView(doc, pack.paywall).teaser ?? doc.label;
    const description = `${doc.code}（${doc.name}）的性格解读：${preview}`;

    return {
      title,
      description,
      keywords: [doc.code, `${doc.code}人格`, `${doc.code}性格`, doc.name, ...doc.keywords],
      alternates: { canonical: absolute(`/t/${slug}/type/${code}`) },
      openGraph: {
        type: "article",
        title,
        description,
        url: absolute(`/t/${slug}/type/${code}`),
        images: [absolute(`/api/og?slug=${slug}&code=${code}`)],
      },
    };
  } catch {
    return { title: "类型不存在" };
  }
}

export default async function TypePage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;

  let pack;
  try {
    pack = loadPack(slug);
  } catch {
    notFound();
  }
  const doc = pack.results[code];
  if (!doc || pack.meta.status !== "published") notFound();

  const allCodes = listResultCodes(pack);
  const order = pack.scoring.codeOrder ?? pack.scoring.dimensions.map((d) => d.id);

  // 这是公开页，付费正文不能整段出现，否则等于绕开付费墙
  const view = freeView(doc, pack.paywall);

  return (
    <>
      <SiteHeader
        title={`${doc.code} ${doc.name}`}
        backHref={`/t/${slug}`}
        action={{ label: "开始测试", href: `/t/${slug}/quiz` }}
      />
      <main className="page" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
        <JsonLd
          data={[
            typeArticleSchema(pack, doc, view.teaser ?? doc.label),
            breadcrumbSchema([
              { name: "首页", path: "/" },
              { name: pack.meta.name, path: `/t/${slug}` },
              { name: "16 种类型", path: `/t/${slug}/type` },
              { name: `${doc.code} ${doc.name}`, path: `/t/${slug}/type/${code}` },
            ]),
            faqSchema(pack.meta.seo.faq),
          ]}
        />

        <nav className="small muted" style={{ marginBottom: "1.25rem" }}>
          <Link href="/">首页</Link>
          {" / "}
          <Link href={`/t/${slug}`}>{pack.meta.name}</Link>
          {" / "}
          <Link href={`/t/${slug}/type`}>16 种类型</Link>
          {" / "}
          <span>{doc.code}</span>
        </nav>

        <div className="stack" style={{ "--stack-gap": "1.75rem" } as React.CSSProperties}>
          <TypePoster code={doc.code} doc={doc} testName={pack.meta.name} compact />
          <Link className="btn btn-block" href={`/t/${slug}/quiz`}>开始测试，看看我的类型</Link>


          <section className="card stack" style={{ "--stack-gap": "1.25rem" } as React.CSSProperties}>
            <SectionHead icon="layers" title={`${doc.code} 这四个字母的意思`} hint="深色一端就是这个类型所在的那边" />
            <TypeSpectrum dimensions={pack.scoring.dimensions} code={code} codeOrder={order} />
            {/* 光谱轴说的是落在哪一边，这张图说的是四个字母怎么拼出来 */}
            <LetterBreakdown code={doc.code} />
          </section>

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            {/* 海报里的类型码是图形排版，这里承担页面真正的 h1 */}
            <SceneSectionHeading scene={illustrations.placements.typeCore}>
              <h1 className="h2">{doc.code} {doc.name}大概是什么样的人</h1>
            </SceneSectionHeading>
            <LockedPreview teaser={view.teaser ?? ""} remaining={view.teaserRemaining} />
          </section>

          <section className="paywall stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <h2 className="h3">想知道自己是不是 {doc.code}？</h2>
            <p className="small" style={{ margin: 0 }}>
              上面写的是 {doc.code} 这个类型的共性。你自己在四个维度上偏到什么程度，
              要做完 {pack.meta.questionCount} 道题才知道。测完免费出结果。
            </p>
            <Link className="btn btn-block" href={`/t/${slug}/quiz`}>
              开始测试，约 {pack.meta.estimatedMinutes} 分钟
            </Link>
          </section>

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <SceneSectionHeading scene={illustrations.placements.typeRelated}>
              <div className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
                <h2 className="h2">{doc.code} 和这几类人怎么相处</h2>
                <p className="small muted" style={{ margin: 0 }}>
                  下面是这几个类型的入口，具体的相处提示在深度报告里。
                </p>
              </div>
            </SceneSectionHeading>
            <p className="wrap" style={{ margin: 0 }}>
              {doc.withOthers.map((item) => {
                const other = pack.results[item.code];
                return (
                  <Link
                    key={item.code}
                    href={`/t/${slug}/type/${item.code}`}
                    className="chip"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent-strong)",
                      textDecoration: "none",
                    }}
                  >
                    {item.code} {other?.name ?? ""}
                  </Link>
                );
              })}
            </p>
          </section>

          <Faq items={pack.meta.seo.faq} />

          <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
            <h2 className="h3">全部 16 种类型</h2>
            <p className="wrap" style={{ margin: 0 }}>
              {allCodes.map((c) => (
                <Link
                  key={c}
                  href={`/t/${slug}/type/${c}`}
                  className="chip"
                  aria-current={c === code ? "page" : undefined}
                  style={{
                    background: c === code ? "var(--accent)" : "var(--surface-sunken)",
                    color: c === code ? "var(--accent-ink)" : "var(--ink-700)",
                    textDecoration: "none",
                  }}
                >
                  {c}
                </Link>
              ))}
            </p>
          </section>

          <div className="notice">{pack.meta.disclaimer}</div>

          <SiteFooter slug={slug} codes={allCodes} />
        </div>
      </main>
    </>
  );
}
