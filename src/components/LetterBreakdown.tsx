const AXES = [
  { pair: ["E", "I"] as const, labels: { E: "外向", I: "内向" } as Record<string, string>, name: "精力从哪来" },
  { pair: ["S", "N"] as const, labels: { S: "实感", N: "直觉" } as Record<string, string>, name: "信息怎么接" },
  { pair: ["T", "F"] as const, labels: { T: "思考", F: "情感" } as Record<string, string>, name: "判断靠什么" },
  { pair: ["J", "P"] as const, labels: { J: "判断", P: "感知" } as Record<string, string>, name: "节奏怎么定" },
];

/**
 * 四个字母是怎么拼出来的。
 *
 * 光谱轴回答「偏多少」，这张图回答「为什么是这四个字母」——两件事分开讲，
 * 用户才不会把类型码当成分数。每条轴两个半格，属于该类型的那一边填色，
 * 右侧掉出一个字母，四行读完就是类型码。
 *
 * 纯静态：不表示任何一次作答，可以出现在介绍页、类型页和站点地图页。
 */
export function LetterBreakdown({
  code,
  /** 介绍页需要序号（第 1 到第 4 条轴），类型页不需要 */
  numbered = false,
  showResult = false,
}: {
  code: string;
  numbered?: boolean;
  showResult?: boolean;
}) {
  const letters = code.toUpperCase().split("");

  return (
    <div className="letters">
      {AXES.map((axis, i) => {
        const picked = letters[i];
        return (
          <div className="letter-row" key={axis.name} data-numbered={numbered ? "true" : undefined}>
            {numbered && <span className="letter-step">{i + 1}</span>}
            <span className="letter-pair">
              {axis.pair.map((letter) => (
                <span key={letter} className="letter-half" data-picked={letter === picked ? "true" : undefined}>
                  {letter} {axis.labels[letter]}
                </span>
              ))}
            </span>
            <b className="letter-out">{picked}</b>
          </div>
        );
      })}

      {showResult && (
        <div className="letters-result">
          <span className="letters-result-label">组合结果</span>
          <span className="letters-result-code">
            {letters.map((letter, i) => (
              <span key={`${letter}-${i}`}>
                <b>{letter}</b>
                <span>{AXES[i].labels[letter]}</span>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
