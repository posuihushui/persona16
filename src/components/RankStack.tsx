/**
 * 顺位阶梯。
 *
 * 用在认知偏好那一段：四段话本身就是有次序的（最先启动的排最前，最弱的排最后），
 * 但摊成四个自然段之后，这个次序只存在于文字里，扫读的人看不见。
 *
 * 做成阶梯之后次序变成画面：序号在左，右边一条越往下越短的带子。
 * 带子表示排在第几位，不表示分数——四条轴的位置由光谱负责，这里不重复表达。
 * 说明这件事的那句话由调用方从内容文件传进来。
 */
export function RankStack({ items, note }: { items: string[]; note?: string }) {
  if (items.length === 0) return null;
  const widths = [100, 78, 58, 40];

  return (
    <div className="ranks">
      {items.map((text, i) => (
        <div className="rank" key={text.slice(0, 12)}>
          <div className="rank-mark">
            <span className="rank-index">{String(i + 1).padStart(2, "0")}</span>
            <span className="rank-bar" aria-hidden="true">
              <span style={{ width: `${widths[i] ?? Math.max(24, 100 - i * 20)}%` }} />
            </span>
          </div>
          <p className="rank-text">{text}</p>
        </div>
      ))}
      {note && <p className="rank-note">{note}</p>}
    </div>
  );
}
