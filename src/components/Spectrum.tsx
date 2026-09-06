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
};

function describe(position: number): string {
  const strength = Math.abs(position - 50) * 2;
  if (strength >= 50) return "很明显";
  if (strength >= 24) return "比较清楚";
  if (strength >= 10) return "略微偏向";
  return "两边差不多";
}

function SpectrumRows({ rows, showNote }: { rows: Row[]; showNote: boolean }) {
  return (
    <div className="spectrum">
      {rows.map((row) => (
        <div key={row.id} className="spectrum-item">
          <div className="spectrum-line">
            <span className={`spectrum-end${row.hit === "left" ? " is-hit" : ""}`}>
              <b>{row.leftPole}</b>
              {row.leftName}
            </span>
            <span className="spectrum-track">
              <span className="spectrum-mid" aria-hidden="true" />
              <span className="spectrum-dot" style={{ left: `${row.position}%` }} />
            </span>
            <span className={`spectrum-end${row.hit === "right" ? " is-hit" : ""}`}>
              <b>{row.rightPole}</b>
              {row.rightName}
            </span>
          </div>
          <p className="spectrum-caption">
            {row.name} · {describe(row.position)}
          </p>
          {showNote && row.note && <p className="spectrum-note">{row.note}</p>}
        </div>
      ))}
    </div>
  );
}

function toRows(
  dimensions: Dimension[],
  resolve: (dim: Dimension) => { position: number; note?: string; pole?: string },
): Row[] {
  return dimensions.flatMap((dim) => {
    const poleIds = Object.keys(dim.poles);
    // 左端固定是 positivePole，位置 0 表示完全偏向它
    const left = dim.positivePole;
    const right = poleIds.find((p) => p !== left);
    if (!right) return [];

    const { position, note, pole } = resolve(dim);
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
      },
    ];
  });
}

/** 用户实际作答的光谱。position 由存下来的 percent 换算，老数据同样适用。 */
export function ScoreSpectrum({
  dimensions,
  scores,
}: {
  dimensions: Dimension[];
  scores: DimensionScore[];
}) {
  const rows = toRows(dimensions, (dim) => {
    const score = scores.find((s) => s.id === dim.id);
    // percent 越大越偏向 positivePole，而 positivePole 画在左边，所以要翻过来
    const position = score ? 100 - score.percent : 50;
    return { position, note: score?.poleSummary, pole: score?.pole };
  });

  return <SpectrumRows rows={rows} showNote />;
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
            <p className="spectrum-caption" style={{ margin: "0 0 0.375rem" }}>
              {dim.name}
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
