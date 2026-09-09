import { toneFor, TypeArt } from "@/components/TypeArt";
import { marqueeUnits, sealMarkup, type PosterAxis } from "@/lib/poster";
import type { ResultDoc } from "@/lib/types";

/**
 * 类型海报。结果页和类型页共用的头图。
 *
 * 这是全站唯一一块以「被截图外发」为设计目标的区域，所以这里
 * 「值得被看见」压过站内其他地方的克制。
 *
 * 完整形态的构图和 /api/og 那张分享卡是同一套：
 * 上面一整块深色装品牌小字、信条、类型码和类型名，主视觉压住色块的下缘，
 * 底下浅色区放四条轴和口语标签，最后一条走马带收口。
 * 之前是「主视觉在上、文字在下」两段平铺，类型码没有地方做大，
 * 右半边还空着一大片。压边之后画面才有前后关系。
 *
 * 紧凑形态是另一回事：它只是文章头图，横排一张缩略图配标题，不喧宾夺主，
 * 所以不套色块、不出走马带，也不画四条轴。
 *
 * 两张卡的分工：这一张印着本人的四条轴，是用户自己截图用的；
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
  /** 压在主视觉上的品牌套印。截图外发时告诉别人这张卡出自哪里 */
  stamp?: string;
}) {
  const tone = toneFor(code);
  const Code = heading ? "h1" : "p";

  return (
    <article
      className={`poster${compact ? " poster--compact" : ""}`}
      style={
        {
          "--poster-bg": tone.card,
          "--poster-ink": tone.ink,
          // 套印色。只用在非文字的地方，小字用 --poster-ink，见 globals.css 第 26 节
          "--poster-ink-strong": tone.deep,
        } as React.CSSProperties
      }
    >
      {/* 完整形态：深色块。类型码在这里才有地方做大 */}
      {!compact && (
        <div className="poster-head">
          <p className="poster-eyebrow">{testName}</p>
          {doc.creed && (
            <div className="poster-creed">
              {creedLabel && <span>{creedLabel}</span>}
              <b>{doc.creed}</b>
            </div>
          )}
          <Code className="poster-code">{code}</Code>
          <p className="poster-name">{doc.name}</p>
        </div>
      )}

      {/*
       * 印章要压在主视觉右上角、一半探到外面，而主视觉自己必须 overflow:hidden
       * 才能有圆角，所以印章不能放在它里面，否则会被裁掉一半。
       * 外面套一层只负责定位、不裁切的容器。
       */}
      <div className="poster-figure">
        <div className="poster-art">
          <TypeArt code={code} fluid />
          {compact && stamp && <span className="poster-stamp">{stamp}</span>}
        </div>
        {/* 骑缝章。和分享卡上那枚是同一段标记，不会一边有一边没有 */}
        {!compact && (
          <svg
            className="poster-seal"
            viewBox="-70 -70 140 140"
            aria-hidden="true"
            focusable="false"
            dangerouslySetInnerHTML={{ __html: sealMarkup({ center: "0 0", radius: 64, middle: "16" }) }}
          />
        )}
      </div>

      <div className="poster-body">
        {/* 紧凑形态把标题留在正文里，横排读起来才是一行 */}
        {compact && (
          <>
            <p className="poster-eyebrow">{testName}</p>
            <div className="poster-headline">
              <Code className="poster-code">{code}</Code>
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
          </>
        )}

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
