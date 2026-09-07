import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHead } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SceneIllustration } from "@/components/SceneIllustration";
import { TypeArt } from "@/components/TypeArt";
import { TypeGrid } from "@/components/TypeGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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

          <TypeGrid pack={pack} />

          <section className="stack" style={{ "--stack-gap": "0.875rem" } as React.CSSProperties}>
            <SectionHead icon="spark" title="一句话认出每一种" />
            <div className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              {codes.map((code) => {
                const doc = pack.results[code];
                return (
                  <Link key={code} href={`/t/${slug}/type/${code}`} className="type-line">
                    <TypeArt code={code} size={38} className="cell-art" />
                    <b>{code}</b>
                    <span>{doc.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="notice">{pack.meta.disclaimer}</div>

          <SiteFooter slug={slug} codes={codes} />
        </div>
      </main>
    </>
  );
}
