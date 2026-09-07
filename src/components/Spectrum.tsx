import ui from "../../content/ui.json";
import type { Dimension, DimensionScore } from "@/lib/types";

/**
 * 维度光谱。
 *
 * 取代原来的单向进度条。进度条会被读成「你有多少分」，而这四个维度不是打分，
 * 是你落在两极之间的哪个位置。两端都标出来，用户一眼就明白这不是考试成绩。
 *
 * 用 CSS 而不是 SVG：布局用 grid，grid 的 gap 从 Chrome 66 起就支持，
 * 不受 flex gap 的兼容限制。深浅色跟随令牌，不需要两套图。
 */

type Row = {
  id: string;
  name: string;
  leftPole: string;
  leftName: string;
  rightPole: string;
  rightName: string;
  /** 0 到 100，0 在最左，100 在最右 */
  position: number;
  /** 命中的是哪一极 */
  hit: "left" | "right";
  note?: string;
  actual?: boolean;
  missing?: boolean;
};

function describe(position: number): string {
  const strength = Math.abs(position - 50) * 2;
  if (strength >= 50) return ui.spectrum.strong;
  if (strength >= 24) return ui.spectrum.clear;
  if (strength >= 10) return ui.spectrum.slight;
  return ui.spectrum.balanced;
}

/**
 * 一条轴的三段式：轴名 + 强度标签在上，字母与百分比在两端，中间是轨道。
 *
 * 强度标签放在右上而不是图下面，是因为用户扫这一块时先看轴名再看强度，
 * 两者在同一行读起来是一句话。百分比跟着字母走，图和数字不用来回对。
 * 轨道从中线填到命中的那一侧：填充长度本身就是「偏了多少」。
 */
function SpectrumRows({
  rows,
  showNote,
  summaryLabel,
}: {
  rows: Row[];
  showNote: boolean;
  /** 传了就在末尾补一条「四条轴合起来」的字母条 */
  summaryLabel?: string;
}) {
  // 只有真实作答那条轴要收窄两端并显示百分比；类型页那条仍用两端的中文名
  const scored = rows.some((row) => row.actual);

  return (
    <div className={`spectrum${scored ? " spectrum--score" : ""}`}>
      {rows.map((row) => {
        const right = Math.round(row.position);
        const hitRight = row.hit === "right";
        // 命中侧从中线填起，填充长度就是偏离中点的幅度
        const fill = hitRight
          ? { left: "50%", right: `${100 - right}%` }
          : { left: `${right}%`, right: "50%" };
        const withPercent = row.actual && !row.missing;

        return (
          <div key={row.id} className="spectrum-item">
            <p className="spectrum-axis-head">
              <span>{row.name}</span>
              <span className="spectrum-strength">
                {row.missing ? ui.spectrum.missing : row.actual ? describe(row.position) : ui.spectrum.typical}
              </span>
            </p>
            <div className="spectrum-line">
              <span className={`spectrum-end${hitRight ? "" : " is-hit"}`}>
                <b>{row.leftPole}</b>
                <span className="spectrum-pct">{withPercent ? `${100 - right}%` : row.leftName}</span>
              </span>
              <span className="spectrum-track" aria-hidden="true">
                <span className="spectrum-mid" aria-hidden="true" />
                {!row.missing && <span className="spectrum-fill" style={fill} />}
                {!row.missing && <span className="spectrum-dot" style={{ left: `${row.position}%` }} />}
              </span>
              <span className={`spectrum-end${hitRight ? " is-hit" : ""}`}>
                <b>{row.rightPole}</b>
                <span className="spectrum-pct">{withPercent ? `${right}%` : row.rightName}</span>
              </span>
            </div>
            {showNote && row.note && <p className="spectrum-note">{row.note}</p>}
          </div>
        );
      })}

      {summaryLabel && (
        <div className="letters-result letters-result--compact">
          <span className="letters-result-label">{summaryLabel}</span>
          <span className="letters-result-code">
            {rows.map((row) => (
              <span key={row.id}>
                <b>{row.hit === "left" ? row.leftPole : row.rightPole}</b>
                <span>{row.hit === "left" ? row.leftName : row.rightName}</span>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function toRows(
  dimensions: Dimension[],
  resolve: (dim: Dimension) => { position: number; note?: string; pole?: string; actual?: boolean; missing?: boolean },
): Row[] {
  return dimensions.flatMap((dim) => {
    const poleIds = Object.keys(dim.poles);
    // 左端固定是 positivePole，位置 0 表示完全偏向它
    const left = dim.positivePole;
    const right = poleIds.find((p) => p !== left);
    if (!right) return [];

    const { position, note, pole, actual, missing } = resolve(dim);
    // 正好落在中点时，位置判断不出方向，以计分引擎给出的极为准
    const hit = pole ? (pole === left ? "left" : "right") : position <= 50 ? "left" : "right";
    return [
      {
        id: dim.id,
        name: dim.name,
        leftPole: left,
        leftName: dim.poles[left].name,
        rightPole: right,
        rightName: dim.poles[right].name,
        position,
        hit: hit as "left" | "right",
        note,
        actual,
        missing,
      },
    ];
  });
}

/** 用户实际作答的光谱。position 由存下来的 percent 换算，老数据同样适用。 */
export function ScoreSpectrum({
  dimensions,
  scores,
  summaryLabel,
}: {
  dimensions: Dimension[];
  scores: DimensionScore[];
  /** 四条轴读完之后，把命中的四个字母再拼一次 */
  summaryLabel?: string;
}) {
  const rows = toRows(dimensions, (dim) => {
    const score = scores.find((s) => s.id === dim.id);
    // percent 越大越偏向 positivePole，而 positivePole 画在左边，所以要翻过来
    const position = score ? 100 - score.percent : 50;
    return { position, note: score?.poleSummary, pole: score?.pole, actual: true, missing: !score };
  });

  return <SpectrumRows rows={rows} showNote summaryLabel={summaryLabel} />;
}

/** 某个类型的典型位置。类型页用，不涉及任何一次具体作答。 */
export function TypeSpectrum({
  dimensions,
  code,
  codeOrder,
}: {
  dimensions: Dimension[];
  code: string;
  codeOrder: string[];
}) {
  const rows = toRows(dimensions, (dim) => {
    const index = codeOrder.indexOf(dim.id);
    const letter = index >= 0 ? code[index] : undefined;
    // 类型只说明落在哪一边，不说明偏多少，所以取两侧的代表位置
    const position = letter === dim.positivePole ? 22 : 78;
    return { position, note: letter ? dim.poles[letter]?.summary : undefined, pole: letter };
  });

  return <SpectrumRows rows={rows} showNote />;
}

/**
 * 四条维度轴的预览，不带任何得分。
 * 落地页用它取代原来的四段嵌套文字，用户扫一眼就知道这个测试在量什么。
 */
export function DimensionAxes({
  dimensions,
  compact = false,
}: {
  dimensions: Dimension[];
  /** 只给两端的名字，不展开每一极的解释。落地页用这个。 */
  compact?: boolean;
}) {
  return (
    <div className="spectrum">
      {dimensions.map((dim) => {
        const left = dim.positivePole;
        const right = Object.keys(dim.poles).find((p) => p !== left);
        if (!right) return null;
        return (
          <div key={dim.id} className="spectrum-item">
            {/* 轴名在左，两端字母的缩写在右。缩写让用户把这条轴和类型码对上 */}
            <p className="spectrum-axis-head">
              <span>{dim.name}</span>
              <span>{left}{right}</span>
            </p>
            <div className="spectrum-line">
              <span className="spectrum-end is-hit">
                <b>{left}</b>
                {dim.poles[left].name}
              </span>
              <span className="spectrum-track is-axis">
                <span className="spectrum-mid" aria-hidden="true" />
              </span>
              <span className="spectrum-end is-hit">
                <b>{right}</b>
                {dim.poles[right].name}
              </span>
            </div>
            {!compact && (
              <>
                <p className="spectrum-note">{dim.poles[left].summary}</p>
                <p className="spectrum-note">{dim.poles[right].summary}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
