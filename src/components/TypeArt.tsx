import { toneFor, typeArtMarkup } from "@/lib/type-art";

/**
 * 类型主视觉的 React 外壳。
 * 画面与色板在 src/lib/type-art.ts，那里没有 JSX，
 * 所以分享卡接口和运维脚本都能直接引用，不会出现两套画法。
 */

/**
 * 小尺寸用的视框。
 *
 * 画布是 400×400，角色四周留了一圈纸。这圈留白在海报上是对的，
 * 但矩阵页 44px、配对卡 40px 的时候，它会把本来就小的角色再缩掉四分之一。
 * 小于这个尺寸就裁掉外圈，只保留角色和地面线那一段。
 */
const TIGHT_AT = 80;
const TIGHT_BOX = "32 44 340 340";

export { toneFor, typeArtMarkup };
export type { Tone } from "@/lib/type-art";

export function TypeArt({
  code,
  size = 240,
  fluid = false,
  className,
}: {
  code: string;
  size?: number;
  /** 撑满容器宽度，高度按 1:1 自适应。海报头图用这个。 */
  fluid?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={fluid ? "100%" : size}
      height={fluid ? undefined : size}
      viewBox={!fluid && size < TIGHT_AT ? TIGHT_BOX : "0 0 400 400"}
      role="img"
      aria-label={`${code} 的主视觉`}
      style={{ display: "block", width: fluid ? "100%" : undefined, height: "auto" }}
      // 内容完全由类型码推导，不含任何外部输入
      dangerouslySetInnerHTML={{ __html: typeArtMarkup(code) }}
    />
  );
}

/**
 * 封面主视觉。落地页头图。
 *
 * 四个色系的形叠在一起，交叠处套印出新的颜色，意思是「四条轴组合出很多种」。
 * 它不对应任何一个具体类型，所以用的是四个家族色的混合，
 * 而不是某一个类型的调色板。
 */
export function CoverArt({ className }: { className?: string }) {
  const nt = toneFor("ENTJ");
  const nf = toneFor("INFP");
  const st = toneFor("ISTJ");
  const sf = toneFor("ESFP");

  return (
    <svg
      className={className}
      viewBox="0 0 400 300"
      role="img"
      aria-label="16 型人格测试主视觉"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        <clipPath id="cover-frame">
          <rect x="0" y="0" width="400" height="300" />
        </clipPath>
      </defs>

      <g clipPath="url(#cover-frame)">
        <rect x="0" y="0" width="400" height="300" fill="#F4F2EE" />

        {/* 地：一条斜切，把画面分成两块 */}
        <path d="M 0 214 L 400 158 L 400 300 L 0 300 Z" fill="#EAE7E0" />

        {/* 四个形叠在一起，靠透明度套印。顺序从大到小，保证都看得见 */}
        <circle cx="128" cy="132" r="104" fill={nt.base} opacity="0.72" />
        <rect x="146" y="52" width="176" height="176" rx="16" fill={st.base} opacity="0.62" />
        <circle cx="286" cy="176" r="92" fill={nf.base} opacity="0.66" />

        {/* 一道弧横穿，把三个形串起来 */}
        <path
          d="M -40 236 Q 200 108 440 214"
          fill="none"
          stroke={sf.base}
          strokeWidth="44"
          strokeLinecap="round"
          opacity="0.58"
        />

        {/* 两个小重音，打破对称 */}
        <circle cx="352" cy="66" r="17" fill={sf.deep} opacity="0.8" />
        <rect x="40" y="248" width="46" height="8" rx="4" fill={nt.deep} opacity="0.7" />
      </g>
    </svg>
  );
}
