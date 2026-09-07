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
 *
 * 优化点（本次）：
 *   1. 卡底补一行四维摘要 + 站点域名。用户截这一张就够了，不用再截光谱那一块。
 *   2. 标签小字改实色（tone.ink 的更深一档），微信压缩后不会糊掉。
 */
export function TypePoster({
  code,
  doc,
  testName,
  compact = false,
  heading = false,
  summary,
  host,
  stamp,
}: {
  code: string;
  doc: Pick<ResultDoc, "name" | "label" | "keywords">;
  testName: string;
  compact?: boolean;
  heading?: boolean;
  /** 四维摘要，形如 "I 82% · N 76% · F 68% · J 66%"。类型页不传（那里没有作答） */
  summary?: string;
  /** 截图外发时的来源标记，传 siteUrl() 的 host */
  host?: string;
  /** 压在几何左上角的品牌套印。截图外发时告诉别人这张卡出自哪里 */
  stamp?: string;
}) {
  const tone = toneFor(code);

  return (
    <article
      className={`poster${compact ? " poster--compact" : ""}`}
      style={
        {
          "--poster-bg": tone.card,
          "--poster-ink": tone.ink,
          // 标签与摘要用的实色。比正文更深，保证 11px 小字也在 4.5:1 以上
          "--poster-ink-strong": tone.deep,
        } as React.CSSProperties
      }
    >
      <div className="poster-art">
        <TypeArt code={code} fluid />
        {stamp && <span className="poster-stamp">{stamp}</span>}
      </div>

      <div className="poster-body">
        <p className="poster-eyebrow">{testName}</p>
        {/* 类型码与类型名同一条基线：截图里它们是一个整体，不是两行 */}
        <div className="poster-headline">
          {heading ? <h1 className="poster-code">{code}</h1> : <p className="poster-code">{code}</p>}
          <p className="poster-name">{doc.name}</p>
        </div>
        <hr className="poster-rule" />
        <p className="poster-label">{doc.label}</p>
        <p className="wrap poster-chips">
          {doc.keywords.map((k) => (
            <span className="chip" key={k}>
              {k}
            </span>
          ))}
        </p>

        {(summary || host) && (
          <div className="poster-summary">
            <b>{summary}</b>
            {host && <span>{host}</span>}
          </div>
        )}
      </div>
    </article>
  );
}
