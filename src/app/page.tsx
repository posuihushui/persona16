import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { listPublishedPacks, listResultCodes } from "@/lib/content";
import { absolute, breadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: absolute("/") },
};

export default function HomePage() {
  const packs = listPublishedPacks();

  return (
    <main className="page" style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
      <JsonLd data={breadcrumbSchema([{ name: "首页", path: "/" }])} />
      <div className="stack" style={{ "--stack-gap": "1.5rem" } as React.CSSProperties}>
        <div className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
          <p className="eyebrow">Persona16</p>
          <h1 className="h1">先看清自己习惯怎么做选择</h1>
          <p className="muted">
            这里的测试不打算给你一个标签然后收工。每一份结果都会告诉你，
            你在什么状态下最省力，在什么状态下最耗电，以及这件事可以怎么办。
          </p>
        </div>

        <div className="stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
          {packs.map((pack) => (
            <Link key={pack.meta.slug} href={`/t/${pack.meta.slug}`} className="card" style={{ display: "block", textDecoration: "none" }}>
              <div className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
                <h2 className="h2">{pack.meta.name}</h2>
                <p className="muted small" style={{ margin: 0 }}>{pack.meta.tagline}</p>
                <p className="small" style={{ color: "var(--accent-strong)", margin: 0 }}>
                  {pack.meta.questionCount} 题 · 约 {pack.meta.estimatedMinutes} 分钟 · 免费出结果
                </p>
              </div>
            </Link>
          ))}
          {packs.map((pack) => (
            <div key={`${pack.meta.slug}-types`} className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
              <p className="small muted" style={{ margin: 0 }}>
                先看看 {pack.meta.name}的类型长什么样：
              </p>
              <p className="wrap" style={{ margin: 0, "--wrap-gap": "0.375rem" } as React.CSSProperties}>
                {listResultCodes(pack).map((code) => (
                  <Link
                    key={code}
                    href={`/t/${pack.meta.slug}/type/${code}`}
                    className="chip"
                    style={{
                      background: "var(--surface-sunken)",
                      color: "var(--ink-700)",
                      textDecoration: "none",
                    }}
                  >
                    {code}
                  </Link>
                ))}
              </p>
            </div>
          ))}
          {packs.length === 0 && <p className="muted">还没有已发布的测试。</p>}
        </div>

        <div className="notice">
          这里的测试是自我认知参考工具，不是心理诊断，也不构成医学建议。
          如果你正被持续的情绪困扰影响生活，请联系专业心理服务或拨打全国心理援助热线 12356。
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
