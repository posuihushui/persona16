import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/Faq";
import { LetterBreakdown } from "@/components/LetterBreakdown";
import { LockedPreview } from "@/components/LockedPreview";
import { TypePoster } from "@/components/TypePoster";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SceneIllustration } from "@/components/SceneIllustration";
import { Reveal, TypeGuideNav } from "@/components/TypeGuide";
import { TraitTiles } from "@/components/TraitTiles";
import { TypeCard } from "@/components/TypeCard";
import { TypeSpectrum } from "@/components/Spectrum";
import { chapterLayout } from "@/lib/prose";
import { freeView, listPublishedPacks, listResultCodes, loadPack } from "@/lib/content";
import type { GuideChapter, ResultDoc } from "@/lib/types";
import { absolute, breadcrumbSchema, faqSchema, typeArticleSchema } from "@/lib/seo";
import illustrations from "../../../../../../content/illustrations.json";

/**
 * 单个类型的解读页。
 *
 * 这是全站最重要的可索引内容：16 个静态页面，互相链接，覆盖用户真正会搜的词
 * （「INFP 是什么样的人」「ESTJ 适合什么工作」）。落地页也是运营投放的承接页，
 * 用户看完某个类型的短视频过来，接住的应该是这一页而不是首页。
 *
 * 正文分节，每节讲一个用户真的会搜的话题：平时什么样、长处与难处、恋爱、友谊、工作。
 * 章节顺序、标题、配图全部来自内容包的 guide 字段，加一节不需要动这个文件。
 * 用词是日常说法、第三人称，讲的是这一类人的共性；
 * 讲「你」的那部分（本次作答的具体位置和可执行动作）属于付费报告，不在这一页。
 *
 * 只渲染免费字段。付费内容不出现在任何可索引页面里。
 */

export const dynamic = "force-static";

const copy = illustrations.typeGuide;

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
    // 描述用公开解读的第一句。付费正文不能从 meta 漏出去
    const lead = doc.guide?.[0]?.lead ?? doc.label;
    const description = `${doc.code}（${doc.name}）的性格解读：${lead}这里用日常的话讲他们平时的样子、长处与难处，以及在恋爱、友谊和工作里的相处方式。`;

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

/**
 * 一节正文。结构由内容包声明，这里只负责怎么摆。
 *
 * 六节如果都是「头图 + 标题 + 两段」，滑到第三节就已经分不清读到哪儿了。
 * 所以版式按这一节自己有什么来选（见 chapterLayout）：
 * 有对照栏的不出图，两栏本身就是画面；出图的几节左右交替。
 */
function Chapter({
  chapter,
  index,
  next,
}: {
  chapter: GuideChapter;
  index: number;
  next?: GuideChapter;
}) {
  const layout = chapterLayout(chapter, index);

  const heading = (
    <div className="guide-chapter-title">
      <p className="guide-chapter-index">
        <span>{String(index + 1).padStart(2, "0")}</span>
        {chapter.nav}
      </p>
      <h2 className="h2">{chapter.title}</h2>
      {/* 结论做成引用卡：不读正文的用户，至少把这一句带走 */}
      <p className="guide-lead">{chapter.lead}</p>
    </div>
  );

  return (
    <section id={chapter.id} className="guide-chapter" data-layout={layout}>
      {layout === "banner" && (
        <>
          <SceneIllustration
            scene={chapter.scene}
            className="guide-chapter-banner"
            variant="banner"
            decorative
          />
          {heading}
        </>
      )}

      {(layout === "split" || layout === "split-reverse") && (
        <div className="guide-split" data-flip={layout === "split-reverse" ? "true" : undefined}>
          <SceneIllustration scene={chapter.scene} className="guide-split-art" decorative />
          {heading}
        </div>
      )}

      {layout === "plain" && heading}

      {chapter.paragraphs.map((para) => (
        <p className="guide-para" key={para.slice(0, 12)}>
          {para}
        </p>
      ))}

      {chapter.good && chapter.hard && (
        <div className="versus guide-versus">
          <div className="versus-col is-good">
            <h3>{chapter.goodTitle ?? "长处"}</h3>
            <ul>
              {chapter.good.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="versus-col is-bad">
            <h3>{chapter.hardTitle ?? "难处"}</h3>
            <ul>
              {chapter.hard.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {chapter.points && chapter.points.length > 0 && (
        <div className="guide-points">
          {chapter.pointsTitle && <p className="guide-points-title">{chapter.pointsTitle}</p>}
          <ul>
            {chapter.points.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {next && (
        <a className="guide-next" href={`#${next.id}`}>
          <span>{copy.nextLabel}</span>
          <b>{next.nav}</b>
        </a>
      )}
    </section>
  );
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
  const doc: ResultDoc | undefined = pack.results[code];
  if (!doc || pack.meta.status !== "published") notFound();

  const allCodes = listResultCodes(pack);

  // 这是公开页，付费正文不能整段出现，否则等于绕开付费墙
  const view = freeView(doc, pack.paywall);
  const chapters = doc.guide ?? [];
  const navItems = chapters.map((chapter) => ({ id: chapter.id, nav: chapter.nav }));

  return (
    <>
      <SiteHeader
        title={`${doc.code} ${doc.name}`}
        backHref={`/t/${slug}`}
        action={{ label: "开始测试", href: `/t/${slug}/quiz` }}
      />
      <main className="page type-page">
        <JsonLd
          data={[
            typeArticleSchema(pack, doc, chapters[0]?.lead ?? doc.label),
            breadcrumbSchema([
              { name: "首页", path: "/" },
              { name: pack.meta.name, path: `/t/${slug}` },
              { name: "16 种类型", path: `/t/${slug}/type` },
              { name: `${doc.code} ${doc.name}`, path: `/t/${slug}/type/${code}` },
            ]),
            faqSchema(pack.meta.seo.faq),
          ]}
        />

        <nav className="small muted crumbs">
          <Link href="/">首页</Link>
          {" / "}
          <Link href={`/t/${slug}`}>{pack.meta.name}</Link>
          {" / "}
          <Link href={`/t/${slug}/type`}>16 种类型</Link>
          {" / "}
          <span>{doc.code}</span>
        </nav>

        <header className="type-hero">
          <div className="type-hero-card">
            <TypePoster code={doc.code} doc={doc} testName={pack.meta.name} compact />
          </div>
          <div className="type-hero-copy">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="type-hero-title">
              {doc.code} {doc.name}是什么样的人
            </h1>
            <p className="type-hero-lead">{copy.heroLead}</p>
            {/* 关键词从一排 chip 换成瓦片：三个词各占一格，也是首屏唯一的横向节奏 */}
            <p className="guide-traits-title">{copy.traitsTitle}</p>
            <TraitTiles code={doc.code} keywords={doc.keywords} />
            <p className="wrap type-hero-meta">
              <span className="chip">{chapters.length} 节</span>
              <span className="chip">约 3 分钟读完</span>
              <span className="chip">免费</span>
            </p>
          </div>
        </header>

        {navItems.length > 0 && <TypeGuideNav chapters={navItems} />}

        <div className="guide-layout">
          <aside className="guide-side">
            <p className="guide-side-title">{copy.tocTitle}</p>
            <ol className="guide-side-list">
              {chapters.map((chapter, i) => (
                <li key={chapter.id}>
                  <a href={`#${chapter.id}`} data-side-for={chapter.id}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {chapter.nav}
                  </a>
                </li>
              ))}
            </ol>
            <p className="guide-side-hint">{copy.tocHint}</p>
            <Link className="btn btn-block guide-side-cta" href={`/t/${slug}/quiz`}>
              开始测试
            </Link>
          </aside>

          <div className="guide-main">
            {chapters.map((chapter, i) => (
              <Reveal key={chapter.id}>
                <Chapter chapter={chapter} index={i} next={chapters[i + 1]} />
              </Reveal>
            ))}

            <Reveal>
              {/*
               * 这个类型大致落在四条轴的哪一边。
               *
               * 光谱组件自己会标「示意位置，不代表你的实际作答」，
               * 所以它不会被读成某个人的得分；四条极的说明文字也因此回到了
               * 这个可索引页面上（之前只在结果页出现过）。
               */}
              <section className="card guide-axes">
                <h2 className="h3">{copy.spectrumTitle}</h2>
                <p className="small muted guide-letters-hint">{copy.spectrumHint}</p>
                <TypeSpectrum
                  dimensions={pack.scoring.dimensions}
                  code={doc.code}
                  codeOrder={pack.scoring.codeOrder ?? pack.scoring.dimensions.map((d) => d.id)}
                />
              </section>
            </Reveal>

            <Reveal>
              <section className="card guide-letters">
                <h2 className="h3">{copy.lettersTitle.replace("{code}", doc.code)}</h2>
                <p className="small muted guide-letters-hint">{copy.lettersHint}</p>
                {/* 这里不放光谱轴：这一页没有任何一次作答，画出圆点会被读成分数 */}
                <LetterBreakdown code={doc.code} />
              </section>
            </Reveal>

            <Reveal>
              <section className="paywall guide-cta">
                <h2 className="h3">{copy.ctaTitle.replace("{code}", doc.code)}</h2>
                <p className="small guide-cta-hint">{copy.ctaHint}</p>
                {view.teaser && <LockedPreview teaser={view.teaser} remaining={view.teaserRemaining} />}
                <Link className="btn btn-block" href={`/t/${slug}/quiz`}>
                  开始测试，约 {pack.meta.estimatedMinutes} 分钟
                </Link>
                <p className="small muted guide-cta-note">
                  {pack.meta.questionCount} 道日常情境题，测完免费出结果。
                </p>
              </section>
            </Reveal>

            <Reveal>
              <section className="guide-related">
                <h2 className="h2">{copy.relatedTitle.replace("{code}", doc.code)}</h2>
                <p className="small muted guide-related-hint">{copy.relatedHint}</p>
                <div className="type-links">
                  {doc.withOthers.map((item) => {
                    const other = pack.results[item.code];
                    return (
                      <TypeCard
                        key={item.code}
                        href={`/t/${slug}/type/${item.code}`}
                        code={item.code}
                        name={other?.name ?? ""}
                        size={40}
                      />
                    );
                  })}
                </div>
              </section>
            </Reveal>

            <Reveal>
              <Faq items={pack.meta.seo.faq} />
            </Reveal>

            <Reveal>
              <section className="guide-all">
                <h2 className="h3">{copy.allTitle}</h2>
                <p className="small muted guide-all-hint">{copy.allHint}</p>
                <p className="wrap guide-all-chips">
                  {allCodes.map((c) => (
                    <Link
                      key={c}
                      href={`/t/${slug}/type/${c}`}
                      className="chip guide-chip"
                      aria-current={c === code ? "page" : undefined}
                      data-current={c === code ? "true" : undefined}
                    >
                      {c}
                    </Link>
                  ))}
                </p>
              </section>
            </Reveal>

            <div className="notice">{pack.meta.disclaimer}</div>
          </div>
        </div>

        <SiteFooter slug={slug} codes={allCodes} />
      </main>
    </>
  );
}
