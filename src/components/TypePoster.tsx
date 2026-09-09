import { toneFor, TypeArt } from "@/components/TypeArt";
import { marqueeUnits, sealMarkup, type PosterAxis } from "@/lib/poster";
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
 *   3. 摘要那一行从文字换成四条色条：同样的数据，扫一眼就读完，
 *      而截图正是「扫一眼」的场景。两端同色，不暗示哪一极更好。
 *   4. 补上信条、口语标签、骑缝章和卡底走马带，把这张卡填满。
 *      内容与顺序来自 src/lib/poster.ts，和 /api/og 那张分享卡是同一份模型。
 *
 * 这一张和分享卡的分工：这一张印着本人的四条轴，是用户自己截图用的；
 * /api/og 那张是公开类型卡，会被转发，所以不含任何一次作答的数据。
 */
export function TypePoster({
  code,
  doc,
  testName,
  compact = false,
  heading = false,
  axes,
  creedLabel,
  host,
  stamp,
}: {
  code: string;
  doc: Pick<ResultDoc, "name" | "label" | "keywords"> & Partial<Pick<ResultDoc, "creed" | "tags">>;
  testName: string;
  compact?: boolean;
  heading?: boolean;
  /** 本次作答的四条轴。类型页不传，那里没有作答，画出来会被读成得分 */
  axes?: PosterAxis[];
  /** 「人生信条」那四个字，来自 ui.json */
  creedLabel?: string;
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
        {/* 骑缝章。和分享卡上那个是同一段标记，不会一边有一边没有 */}
        {!compact && stamp && (
          <svg
            className="poster-seal"
            viewBox="-70 -70 140 140"
            aria-hidden="true"
            focusable="false"
            dangerouslySetInnerHTML={{
              __html: sealMarkup({ center: "0 0", radius: 64, ring: sealRing(stamp), middle: "16" }),
            }}
          />
        )}
      </div>

      <div className="poster-body">
        <p className="poster-eyebrow">{testName}</p>
        {!compact && doc.creed && (
          <div className="poster-creed">
            {creedLabel && <span>{creedLabel}</span>}
            <b>{doc.creed}</b>
          </div>
        )}
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

        {/*
         * 四条轴。原来是一行 "I 82% · N 76% ·…" 的文字，信息都在但要读。
         * 换成色条之后从中线往命中那一端填，填多少就是偏多少。
         * 两端用同一个色系：站内橙色代表消耗、蓝色代表舒服，
         * 而这四条轴的两极都没有好坏之分，用两个色系会暗示有。
         */}
        {!compact && axes && axes.length > 0 && (
          <ul className="poster-axes">
            {axes.map((axis) => (
              <li className="poster-axis" key={axis.id}>
                <b>{axis.hitRight ? axis.other : axis.pole}</b>
                <span className="poster-axis-track">
                  <span
                    className="poster-axis-fill"
                    style={
                      axis.hitRight
                        ? { left: "50%", right: `${100 - axis.percent}%` }
                        : { left: `${100 - axis.percent}%`, right: "50%" }
                    }
                  />
                </span>
                <b>{axis.hitRight ? axis.pole : axis.other}</b>
                <i>{axis.percent}%</i>
              </li>
            ))}
          </ul>
        )}

        {!compact && doc.tags && doc.tags.length > 0 && (
          <ul className="poster-tags">
            {doc.tags.slice(0, 6).map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}

        {host && (
          <div className="poster-summary">
            <span>{host}</span>
          </div>
        )}
      </div>

      {/* 走马带。纯排版，把卡底填满并把类型码再说一次 */}
      {!compact && (
        <div className="poster-band" aria-hidden="true">
          <span>{marqueeUnits(code, 8).map((unit) => `${unit}　·　`).join("")}</span>
        </div>
      )}
    </article>
  );
}

/** 印章绕圈的小字。重复品牌名填满一圈，短了圆上会留一段空白。 */
function sealRing(stamp: string): string {
  let ring = "";
  while (Array.from(ring).length < 16) ring += `${stamp}　·　`;
  return ring;
}
