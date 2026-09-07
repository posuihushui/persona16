import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Quiz } from "@/components/Quiz";
import { TrackView } from "@/components/TrackView";
import { loadPack } from "@/lib/content";
import illustrations from "../../../../../content/illustrations.json";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let pack;
  try {
    pack = loadPack(slug);
  } catch {
    notFound();
  }
  if (pack.meta.status !== "published") notFound();

  return (
    // 头部由 Quiz 自己出血渲染（进度要贴在页面顶边），这里不再留上边距
    <main className="page page-bottom" style={{ paddingTop: 0 }}>
      <TrackView name="quiz_start" slug={slug} />
      <Quiz
        slug={slug}
        version={pack.meta.version}
        questions={pack.questions.questions}
        options={pack.questions.scale.options}
        scene={illustrations.placements.quiz}
        groups={pack.scoring.dimensions.map((d) => ({ id: d.id, name: d.name }))}
      />
    </main>
  );
}
