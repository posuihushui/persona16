import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHead } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SceneIllustration } from "@/components/SceneIllustration";
import { TypeCard } from "@/components/TypeCard";
import { TypeFilter } from "@/components/TypeFilter";
import { TypeGrid } from "@/components/TypeGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { axisLetters, groupCodes } from "@/lib/codes";
import { listPublishedPacks, listResultCodes, loadPack } from "@/lib/content";
import { absolute, breadcrumbSchema, typeListSchema } from "@/lib/seo";
import illustrations from "../../../../../content/illustrations.json";

/** 类型索引页。抓取器一次看到全部 16 个类型的入口，也是站内链接的枢纽。 */

export const dynamic = "force-static";

export function generateStaticParams() {
  return listPublishedPacks().map((pack) => ({ slug: pack.meta.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const pack = loadPack(slug);
    const title = `${pack.meta.name}的 16 种类型分别是什么`;
    const description = `${pack.meta.name}全部 16 种人格类型的解读入口，每种类型包含性格描述、最舒服的状态和最容易累的状态。`;
    return {
      title,
      description,
      alternates: { canonical: absolute(`/t/${slug}/type`) },
      openGraph: { title, description, url: absolute(`/t/${slug}/type`) },
    };
  } catch {
    return { title: "测试不存在" };
  }
}

export default async function TypeIndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let pack;
  try {
    pack = loadPack(slug);
  } catch {
    notFound();
  }
  if (pack.meta.status !== "published") notFound();

  const codes = listResultCodes(pack);

  return (
    <>
      <SiteHeader
        title="16 种类型"
        backHref={`/t/${slug}`}
        action={{ label: "开始测试", href: `/t/${slug}/quiz` }}
      />
      <main className="page" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
        <JsonLd
          data={[
            typeListSchema(pack, codes),
            breadcrumbSchema([
              { name: "首页", path: "/" },
              { name: pack.meta.name, path: `/t/${slug}` },
              { name: "16 种类型", path: `/t/${slug}/type` },
            ]),
          ]}
        />

        <div className="stack" style={{ "--stack-gap": "1.5rem" } as React.CSSProperties}>
          <div className="scene-note">
            <SceneIllustration scene={illustrations.placements.typeIndex} className="scene-note-art" priority />
            <div className="scene-note-copy stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
              <h1 className="h1">{illustrations.types.title}</h1>
              <p className="muted">{illustrations.types.hint}</p>
            </div>
          </div>

          <Link className="btn btn-block" href={`/t/${slug}/quiz`}>
            直接开始测试
          </Link>

          {/*
           * 这一页有两块东西，它们是同一批类型的两种排法，所以必须长得不一样：
           * 上面是地图，只有格子和图，回答「我在哪一格」；
           * 下面是目录，有名字和那句话，回答「这一格是什么」。
           * 两块都做成白底卡片列过一版，读起来就是把 16 个类型倒了两遍。
           */}
          <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <SectionHead
              icon="grid"
              title={illustrations.types.mapTitle}
              hint={illustrations.types.mapHint}
            />
            <TypeGrid pack={pack} />
          </section>

          <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <SectionHead
              icon="spark"
              title={illustrations.types.listTitle}
              hint={illustrations.types.listHint}
            />
            <TypeFilter
              groups={axisLetters(pack)}
              allLabel={illustrations.types.filterAll}
              hint={illustrations.types.filterHint}
            />
            <div className="stack" style={{ "--stack-gap": "1.25rem" } as React.CSSProperties}>
              {groupCodes(pack, codes).map((group) => (
                <div className="code-group" key={group.key}>
                  <p className="code-group-head">
                    <b>{group.letters.join("")}</b>
                    <span>{group.names.join(" · ")}</span>
                  </p>
                  <div className="code-group-cards">
                    {group.codes.map((code) => (
                      <TypeCard
                        key={code}
                        href={`/t/${slug}/type/${code}`}
                        code={code}
                        name={pack.results[code].name}
                        label={pack.results[code].label}
                        size={60}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="notice">{pack.meta.disclaimer}</div>

          <SiteFooter slug={slug} codes={codes} />
        </div>
      </main>
    </>
  );
}
