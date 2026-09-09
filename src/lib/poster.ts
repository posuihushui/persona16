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

/** 断行。中文按字数切，够用且两个渲染器算出来一样。 */
export function wrapText(text: string, perLine: number): string[] {
  const lines: string[] = [];
  for (const character of Array.from(text)) {
    const last = lines[lines.length - 1];
    if (last === undefined || Array.from(last).length >= perLine) lines.push(character);
    else lines[lines.length - 1] = last + character;
  }
  return lines;
}

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
 * 一圈绕排的小字加中间一个大字。绕排没有用 textPath：那要引用同文档里的 path，
 * 分享卡是塞进 <img> 再画进 canvas 的，隔离渲染下老内核对 textPath 的支持不齐，
 * 而印章画错正好属于「分享卡和页面长得不一样」那类很难被发现的问题。
 * 这里改成逐字定位加逐字旋转，任何内核算出来都一样。
 */
export function sealMarkup({
  center,
  radius,
  ring,
  middle,
  fill = POSTER_GOLD,
  ink = POSTER_GOLD_INK,
}: {
  center: string;
  radius: number;
  /** 绕圈的那行小字 */
  ring: string;
  /** 中间的大字 */
  middle: string;
  fill?: string;
  ink?: string;
}): string {
  const characters = Array.from(ring);
  const step = 360 / Math.max(characters.length, 1);
  const textRadius = radius - radius * 0.22;
  const glyphs = characters
    .map((character, i) => {
      const angle = -90 + i * step;
      const radian = (angle * Math.PI) / 180;
      const x = Math.cos(radian) * textRadius;
      const y = Math.sin(radian) * textRadius;
      // 每个字自己转到切线方向，整圈读起来才是连贯的一行
      return `<text x="0" y="0" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(angle + 90).toFixed(2)})" text-anchor="middle" font-size="${(radius * 0.2).toFixed(1)}" letter-spacing="0.5">${escapeXml(character)}</text>`;
    })
    .join("");

  return `<g transform="translate(${center})">
    <circle r="${radius}" fill="${fill}"/>
    <circle r="${radius - radius * 0.1}" fill="none" stroke="${ink}" stroke-width="1.5" opacity="0.45"/>
    <g fill="${ink}" opacity="0.85">${glyphs}</g>
    <text x="0" y="${(radius * 0.16).toFixed(1)}" text-anchor="middle" font-size="${(radius * 0.52).toFixed(1)}" font-weight="700" fill="${ink}">${escapeXml(middle)}</text>
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

/**
 * 分享卡。900×1200，被塞进 <img> 再画进 canvas 转成 PNG。
 *
 * 这张卡是公开的类型卡，会被转发，所以**不含任何一次作答的数据**：
 * 没有四条轴的位置，也没有 attemptId。个人的那四个位置只出现在结果页上那张
 * 用户自己截图的海报里（见 TypePoster 的色条）。
 *
 * 排版顺序和网页那张海报一致：几何、信条、类型码与名字、一句标签、口语标签、走马带。
 * 两边的内容与顺序都从这个文件来，不会各写各的。
 */
export function posterCardMarkup({
  code,
  name,
  label,
  creed,
  creedLabel,
  tags,
  brand,
  ring,
  tone,
  artMarkup,
}: {
  code: string;
  name: string;
  label: string;
  creed?: string;
  creedLabel: string;
  tags: string[];
  /** 顶部的小字，用测试名 */
  brand: string;
  /** 印章绕圈的那行字 */
  ring: string;
  tone: { card: string; ink: string; deep: string; base: string; washB: string };
  /** typeArtMarkup(code) 的结果，几何两边共用同一份 */
  artMarkup: string;
}): string {
  const font = "PingFang SC, HarmonyOS Sans SC, MiSans, Microsoft YaHei, sans-serif";
  const left = 64;
  const right = 836;
  const bandTop = 1124;

  const labelLines = wrapText(label, 20);
  const labelSize = labelLines.length > 2 ? 28 : 32;

  /*
   * 上半部从顶往下排。位置写死是因为几何图形的高度是固定的，
   * 只有 label 的行数会变，往下顺延就够了。
   */
  const brandY = 558;
  const creedLabelY = 598;
  const creedY = 642;
  const codeY = creed ? 742 : 700;
  const nameY = codeY + 52;
  const ruleY = nameY + 32;
  const labelY = ruleY + 44;
  const topBottom = labelY + (labelLines.length - 1) * 42 + labelSize * 0.6;

  /*
   * 标签贴着走马带从底往上排，所以它永远不会压到带子上。
   * 万一上下两块还是会碰（label 特别长又赶上标签特别长），
   * 从后往前减条数直到排得下——宁可少两条标签，也不能让两块字叠在一起。
   */
  const tagSize = 24;
  const tagBottom = bandTop - 20;
  let shown = tags.slice(0, 6);
  let flow = flowTags(shown, left, right, tagSize, 12);
  while (shown.length > 2 && topBottom + 24 > tagBottom - flow.height) {
    shown = shown.slice(0, shown.length - 1);
    flow = flowTags(shown, left, right, tagSize, 12);
  }
  const tagsTop = tagBottom - flow.height;

  const creedBlock = creed
    ? `<text x="${left}" y="${creedLabelY}" font-size="20" letter-spacing="4" opacity="0.6">${escapeXml(creedLabel)}</text>
       <text x="${left}" y="${creedY}" font-size="38" font-weight="600">${escapeXml(creed)}</text>`
    : "";

  const tagMarkup = flow.boxes
    .map(
      (box) =>
        `<g transform="translate(${box.x} ${(tagsTop + box.y).toFixed(1)})">
          <rect x="0" y="0" rx="${(flow.pill / 2).toFixed(0)}" width="${box.width.toFixed(0)}" height="${flow.pill.toFixed(0)}" fill="${tone.washB}" opacity="0.75"/>
          <text x="${(box.width / 2).toFixed(0)}" y="${(flow.pill * 0.66).toFixed(0)}" text-anchor="middle" font-size="${tagSize}" fill="${tone.ink}">${escapeXml(box.text)}</text>
        </g>`,
    )
    .join("");

  // 走马带。纯排版：把卡底填满，并把类型码再说一次
  const marquee = marqueeUnits(code, 8)
    .map((unit) => `${unit}　·　`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200" font-family="${font}">
    <defs>
      <clipPath id="band"><rect x="0" y="${bandTop}" width="900" height="${1200 - bandTop}"/></clipPath>
      <clipPath id="artframe"><rect x="206" y="34" width="488" height="488" rx="26"/></clipPath>
    </defs>
    <rect width="900" height="1200" fill="${tone.card}"/>
    <!--
      主视觉自带一张不透明的纸色底，直接贴在卡的浅色底上会留一道没道理的接缝。
      圆角裁切加一圈细边之后，它读起来是一块有意为之的画板。
    -->
    <g clip-path="url(#artframe)"><g transform="translate(206 34) scale(1.22)">${artMarkup}</g></g>
    <rect x="206" y="34" width="488" height="488" rx="26" fill="none" stroke="${tone.washB}" stroke-width="2"/>
    ${sealMarkup({ center: "780 120", radius: 64, ring, middle: "16" })}
    <g fill="${tone.ink}">
      <text x="${left}" y="${brandY}" font-size="22" letter-spacing="5" opacity="0.65">${escapeXml(brand)}</text>
      ${creedBlock}
      <text x="${left - 4}" y="${codeY}" font-size="116" font-weight="700" letter-spacing="-3">${escapeXml(code)}</text>
      <text x="${left}" y="${nameY}" font-size="38" font-weight="600">${escapeXml(name)}</text>
      <path d="M${left} ${ruleY}h64" stroke="${tone.ink}" stroke-width="3" opacity="0.4"/>
      ${labelLines.map((line, i) => `<text x="${left}" y="${labelY + i * 42}" font-size="${labelSize}">${escapeXml(line)}</text>`).join("")}
    </g>
    ${tagMarkup}
    <g clip-path="url(#band)">
      <rect x="0" y="${bandTop}" width="900" height="${1200 - bandTop}" fill="${tone.ink}"/>
      <text x="${left}" y="${bandTop + 48}" font-size="28" font-weight="700" letter-spacing="6" fill="${tone.card}" opacity="0.92">${escapeXml(marquee)}</text>
    </g>
  </svg>`;
}
