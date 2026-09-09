import { toneFor } from "@/components/TypeArt";

/**
 * 类型关键词瓦片。
 *
 * 关键词原本是一排 chip，三个词挤在一行，读起来和标签没区别。
 * 摊成瓦片之后每个词有自己的位置，也是这一节里唯一的横向节奏。
 *
 * 标记按 S 是方、N 是圆区分，用的是类型自己的色板，
 * 所以瓦片一眼就属于这个类型，不是随便挑的装饰。形状不表达强弱，三块永远同样大。
 * 主视觉从几何换成动物之后这条规则只剩瓦片在用了，它自己成立，不必跟着改。
 *
 * 只有标记用类型色。类型色板是固定的浅色（它要跟着主视觉一起被截图），
 * 拿它当底色会在深色模式下变成浅底配浅字，所以底色和文字一律走主题令牌。
 */
export function TraitTiles({ code, keywords }: { code: string; keywords: string[] }) {
  if (keywords.length === 0) return null;
  const tone = toneFor(code);
  const round = code[1] === "N";

  return (
    <ul className="traits">
      {keywords.map((word) => (
        <li
          className="trait"
          key={word}
        >
          <span
            className="trait-mark"
            aria-hidden="true"
            style={
              {
                background: tone.base,
                borderRadius: round ? "50%" : "3px",
              } as React.CSSProperties
            }
          />
          <b>{word}</b>
        </li>
      ))}
    </ul>
  );
}
