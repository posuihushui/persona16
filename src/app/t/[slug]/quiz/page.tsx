import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Quiz } from "@/components/Quiz";
import { SceneIllustration } from "@/components/SceneIllustration";
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
    <main className="page page-bottom" style={{ paddingTop: "1.75rem" }}>
      <TrackView name="quiz_start" slug={slug} />
      <div className="quiz-page-heading">
        <SceneIllustration scene={illustrations.placements.quiz} className="quiz-heading-art" priority />
        <p className="small muted">{illustrations.quiz.hint}</p>
      </div>
      <Quiz
        slug={slug}
        version={pack.meta.version}
        questions={pack.questions.questions}
        options={pack.questions.scale.options}
      />
    </main>
  );
}
