import type { Dimension, DimensionScore } from "@/lib/types";

/**
 * 海报的共享模型。
 *
 * 结果页的 React 海报和 /api/og 的分享卡是两个渲染目标：一个要响应式、可选中、
 * 有正确的标题层级，另一个是固定 900×1200、要被画进 canvas 转 PNG。
 * 强行让两边输出同一段标记会把网页那张拖成一张不能换行的图，所以这里合的是**模型**：
 * 卡上有哪些块、什么顺序、文字怎么断行、色条填到哪、印章和走马带写什么，
 * 全部由这个文件算出来，两个渲染器只负责画。
 *
 * 这样两边不可能在「卡上有什么」这件事上分歧——真正会出问题、而且很难被发现的
 * 正是这一类分歧，不是差几个像素。几何图形本来就共用 typeArtMarkup，
 * 印章和走马带这两块纯图形也在这里出标记，两边直接内联同一段。
 */

/**
 * 品牌金。
 *
 * 类型色板整体压在 36% 饱和度以下，因为大面积高饱和在手机上显得廉价。
 * 但海报是全站唯一以被截图外发为目标的区域，需要一个能跳出来的重音。
 * 折中做法是 16 张卡共用这一个高饱和色，只出现在印章上：
 * 一个亮点比 16 套吵闹的配色更像一个系列。
 */
export const POSTER_GOLD = "#e8b230";
export const POSTER_GOLD_INK = "#5a3d05";

/** 一条轴在海报上的样子。percent 是命中那一端的强度，50 到 100。 */
export type PosterAxis = {
  id: string;
  /** 命中的那个字母 */
  pole: string;
  /** 另一端的字母，画在色条另一侧 */
  other: string;
  percent: number;
  /** 命中的是不是右端。决定色条从中线往哪边填 */
  hitRight: boolean;
};

/**
 * 四条轴的色条模型。
 *
 * 只有真实作答才有这个——公开分享卡上不能出现它，那张卡会被转发，
 * 画上位置会被读成转发者的作答。所以调用方传不进 scores 时这里返回空数组。
 */
export function posterAxes(
  dimensions: Dimension[],
  scores: DimensionScore[] | undefined,
): PosterAxis[] {
  if (!scores || scores.length === 0) return [];
  return dimensions.flatMap((dim) => {
    const score = scores.find((s) => s.id === dim.id);
    if (!score) return [];
    const other = Object.keys(dim.poles).find((p) => p !== score.pole) ?? "";
    // percent 越大越偏向 positivePole，而 positivePole 画在左边
    const hitRight = score.pole !== dim.positivePole;
    return [
      {
        id: dim.id,
        pole: score.pole,
        other,
        percent: Math.round(Math.max(score.percent, 100 - score.percent)),
        hitRight,
      },
    ];
  });
}

/** 走马带的重复单元。纯排版，把卡底填满并再说一次类型码。 */
export function marqueeUnits(code: string, repeat = 6): string[] {
  const units: string[] = [];
  for (let i = 0; i < repeat; i += 1) units.push(code);
  return units;
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
}

/**
 * 骑缝章。
 *
 * 原来一圈绕排着品牌名，但那行字在 124px 的章上只有 12px，
 * 转成 PNG 又被微信压一道之后糊成一团噪点，而且有一半是倒着的。
 * 改成一枚干净的金币：实心圆、一道内圈细线、中间一个大字。
 * 在卡上是 124px、在结果页上是 52px，两个尺寸都认得出来。
 * 品牌名在卡的左上角已经出现过一次，不必在这里再说一遍。
 */
export function sealMarkup({
  center,
  radius,
  middle,
  fill = POSTER_GOLD,
  ink = POSTER_GOLD_INK,
}: {
  center: string;
  radius: number;
  /** 中间的字 */
  middle: string;
  fill?: string;
  ink?: string;
}): string {
  return `<g transform="translate(${center})">
    <circle r="${radius}" fill="${fill}"/>
    <circle r="${(radius - radius * 0.13).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="2" opacity="0.4"/>
    <text x="0" y="${(radius * 0.2).toFixed(1)}" text-anchor="middle" font-size="${(radius * 0.62).toFixed(1)}" font-weight="700" fill="${ink}">${escapeXml(middle)}</text>
  </g>`;
}

/** 一条标签在卡上的位置与尺寸。宽度按中文一个字约等于一个字号估算，够用。 */
type TagBox = { text: string; x: number; y: number; width: number };

function flowTags(tags: string[], left: number, right: number, fontSize: number, gap: number): {
  boxes: TagBox[];
  height: number;
  pill: number;
} {
  const padding = fontSize * 0.72;
  const rowHeight = fontSize * 2.05;
  const boxes: TagBox[] = [];
  let x = left;
  let row = 0;
  for (const text of tags) {
    const width = Array.from(text).length * fontSize + padding * 2;
    if (x !== left && x + width > right) {
      row += 1;
      x = left;
    }
    boxes.push({ text, x, y: row * rowHeight, width });
    x += width + gap;
  }
  // 高度算到最后一行胶囊的底边，不是最后一行的基线
  const pill = fontSize * 2.4;
  return { boxes, height: boxes.length ? row * rowHeight + pill : 0, pill };
}

export function posterCardMarkup({
  code,
  name,
  creed,
  creedLabel,
  tags,
  brand,
  tone,
  artMarkup,
}: {
  code: string;
  name: string;
  creed?: string;
  creedLabel: string;
  tags: string[];
  /** 顶部的小字，用测试名 */
  brand: string;
  tone: { card: string; ink: string; deep: string; base: string; washB: string };
  /** typeArtMarkup(code) 的结果，几何两边共用同一份 */
  artMarkup: string;
}): string {
  const font = "PingFang SC, HarmonyOS Sans SC, MiSans, Microsoft YaHei, sans-serif";
  const left = 64;
  const right = 836;
  const bandTop = 1124;

  /*
   * 构图：上面一整块深色，主视觉压住它的下缘，剩下的浅色区放标签。
   *
   * 之前是左对齐的一列文字加一个居中的小面板，右半边整片空着，
   * 骑缝章还飘在面板外面。改成色块加压边之后画面有了前后关系，
   * 类型码也终于有地方做大。
   *
   * 主视觉必须保持方形。量过 16 只动物在 400 见方里的实际占位：
   * 横向都在 30 到 377 之间，纵向最高的到 33、最矮的只到 174，
   * 横向满幅铺开就得纵向裁切，会把高的那几只切掉。
   */
  const blockBottom = 430;
  const art = { x: 160, y: 380, size: 580 };
  /*
   * 主视觉四周有一圈固定的空白。量过 16 只动物：横向都落在 30 到 377 之间，
   * 纵向最低到 376，所以裁掉每边 22 个单位不会切到任何一只，画面还能大一成。
   * 各自上方剩多少空当取决于那只动物画得多高，那是画本身的事，这里不逐类型调。
   */
  const inset = 22;
  const scale = art.size / (400 - inset * 2);

  const tagSize = 24;
  const tagBottom = bandTop - 20;
  let shown = tags.slice(0, 6);
  let flow = flowTags(shown, left, right, tagSize, 12);
  // 标签贴着走马带从底往上排，排不下就从后往前减，永远压不到主视觉和带子
  while (shown.length > 2 && art.y + art.size + 24 > tagBottom - flow.height) {
    shown = shown.slice(0, shown.length - 1);
    flow = flowTags(shown, left, right, tagSize, 12);
  }
  const tagsTop = tagBottom - flow.height;

  const tagMarkup = flow.boxes
    .map(
      (box) =>
        `<g transform="translate(${box.x} ${(tagsTop + box.y).toFixed(1)})">
          <rect x="0" y="0" rx="${(flow.pill / 2).toFixed(0)}" width="${box.width.toFixed(0)}" height="${flow.pill.toFixed(0)}" fill="${tone.washB}"/>
          <text x="${(box.width / 2).toFixed(0)}" y="${(flow.pill * 0.66).toFixed(0)}" text-anchor="middle" font-size="${tagSize}" fill="${tone.ink}">${escapeXml(box.text)}</text>
        </g>`,
    )
    .join("");

  const creedBlock = creed
    ? `<text x="${left}" y="138" font-size="20" letter-spacing="4" fill="${tone.card}">${escapeXml(creedLabel)}</text>
       <text x="${left}" y="196" font-size="42" font-weight="600" fill="${tone.card}">${escapeXml(creed)}</text>`
    : "";

  const marquee = marqueeUnits(code, 8)
    .map((unit) => `${unit}　·　`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200" font-family="${font}">
    <defs>
      <clipPath id="band"><rect x="0" y="${bandTop}" width="900" height="${1200 - bandTop}"/></clipPath>
      <clipPath id="artframe"><rect x="${art.x}" y="${art.y}" width="${art.size}" height="${art.size}" rx="30"/></clipPath>
    </defs>

    <rect width="900" height="1200" fill="${tone.card}"/>
    <rect width="900" height="${blockBottom}" fill="${tone.ink}"/>

    <g fill="${tone.card}">
      <text x="${left}" y="76" font-size="22" letter-spacing="5">${escapeXml(brand)}</text>
      ${creedBlock}
      <text x="${left - 4}" y="322" font-size="124" font-weight="700" letter-spacing="-3">${escapeXml(code)}</text>
      <text x="${left}" y="378" font-size="36" font-weight="600">${escapeXml(name)}</text>
    </g>

    <!-- 主视觉压住色块下缘。它自带一张纸底，圆角裁切让它成为一块画板 -->
    <g clip-path="url(#artframe)">
      <g transform="translate(${(art.x - inset * scale).toFixed(1)} ${(art.y - inset * scale).toFixed(1)}) scale(${scale.toFixed(4)})">${artMarkup}</g>
    </g>
    <rect x="${art.x}" y="${art.y}" width="${art.size}" height="${art.size}" rx="30" fill="none" stroke="${tone.washB}" stroke-width="2"/>

    ${sealMarkup({ center: `${art.x + art.size - 18} ${art.y + 14}`, radius: 62, middle: "16" })}

    ${tagMarkup}

    <g clip-path="url(#band)">
      <rect x="0" y="${bandTop}" width="900" height="${1200 - bandTop}" fill="${tone.ink}"/>
      <text x="${left}" y="${bandTop + 48}" font-size="28" font-weight="700" letter-spacing="6" fill="${tone.card}" opacity="0.92">${escapeXml(marquee)}</text>
    </g>
  </svg>`;
}
