import Link from "next/link";
import { SceneIllustration } from "@/components/SceneIllustration";
import type { GuideChapter } from "@/lib/types";

/**
 * 公开解读的章节入口。
 *
 * 结果页原来除了海报和四条轴，剩下的免费内容只有一段 62 字的预览。
 * 但这个类型的公开解读本来就是免费的，只是全部躺在另一个页面上。
 * 摆成一排卡片，用户知道还有几节可以读，也知道读的是「这一类人」而不是「你」。
 *
 * 卡片链接到公开类型页的对应锚点，不复制正文——正文只有一份，在那一页。
 */
export function ChapterCards({
  chapters,
  href,
  max = 4,
}: {
  chapters: GuideChapter[];
  /** 类型页地址，锚点由每节的 id 拼上 */
  href: string;
  max?: number;
}) {
  if (chapters.length === 0) return null;

  return (
    <div className="chapter-cards">
      {chapters.slice(0, max).map((chapter) => (
        <Link key={chapter.id} href={`${href}#${chapter.id}`} className="chapter-card">
          <SceneIllustration scene={chapter.scene} className="chapter-card-art" decorative />
          <span className="chapter-card-body">
            <b>{chapter.nav}</b>
            <span>{chapter.lead}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
