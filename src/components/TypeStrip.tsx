import Link from "next/link";
import { TypeArt } from "@/components/TypeArt";

/**
 * 16 型主视觉横条。
 *
 * 首页原来只有一句「16 种组合」，用户要点进目录页才知道这 16 张图长什么样。
 * 横条把它们直接摆出来：一眼看到成套的视觉，也顺便说明「每个类型有自己的一张卡」。
 *
 * 窄屏横向滚动，页面本身不横向滚（外层 overflow-x 自己滚，符合基准里的那一条）。
 */
export function TypeStrip({
  slug,
  codes,
  label,
}: {
  slug: string;
  codes: string[];
  /** 读屏用的整体说明 */
  label: string;
}) {
  if (codes.length === 0) return null;

  return (
    <div className="type-strip" role="list" aria-label={label}>
      {codes.map((code) => (
        <Link key={code} href={`/t/${slug}/type/${code}`} className="type-strip-item" role="listitem">
          <TypeArt code={code} size={56} />
          <b>{code}</b>
        </Link>
      ))}
    </div>
  );
}
