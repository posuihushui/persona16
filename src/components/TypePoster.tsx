import { toneFor, TypeArt } from "@/components/TypeArt";
import type { ResultDoc } from "@/lib/types";

/**
 * 类型海报。结果页和类型页共用的头图。
 *
 * 这是全站唯一一块以「被截图外发」为设计目标的区域，所以：
 *   图占满卡片上半部，不做小缩略图
 *   底色来自类型自己的色板，深浅色模式下长得一样
 *   文字做真正的层次：小字拉字距当标签，类型码做大并收紧字距，
 *   中间一条短线断开，描述用更宽松的行高
 */
export function TypePoster({
  code,
  doc,
  testName,
  compact = false,
  heading = false,
}: {
  code: string;
  doc: Pick<ResultDoc, "name" | "label" | "keywords">;
  testName: string;
  compact?: boolean;
  heading?: boolean;
}) {
  const tone = toneFor(code);

  return (
    <article
      className={`poster${compact ? " poster--compact" : ""}`}
      style={
        {
          "--poster-bg": tone.card,
          "--poster-ink": tone.ink,
        } as React.CSSProperties
      }
    >
      <div className="poster-art">
        <TypeArt code={code} fluid />
      </div>

      <div className="poster-body">
        <p className="poster-eyebrow">{testName}</p>
        {heading ? <h1 className="poster-code">{code}</h1> : <p className="poster-code">{code}</p>}
        <p className="poster-name">{doc.name}</p>
        <hr className="poster-rule" />
        <p className="poster-label">{doc.label}</p>
        <p className="wrap poster-chips">
          {doc.keywords.map((k) => (
            <span className="chip" key={k}>
              {k}
            </span>
          ))}
        </p>
      </div>
    </article>
  );
}
