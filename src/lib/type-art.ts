/**
 * 类型主视觉。
 *
 * 16 张大幅几何构成，同一套设计语言，每张由类型码生成，互不相同。
 * 走包豪斯套印的路子：一个主形、一条切过它的带、两者交叠处压出第三个颜色。
 * 形少、色少，靠构成本身和交叠关系说话，不靠堆元素。
 *
 * 四个字母各控制一件事，而且必须一眼看得出差别：
 *   E / I  主形巨大并冲出画面  ←→  主形收小，四周大量留白
 *   S / N  主形是方           ←→  是圆
 *   T / F  切带硬边、左上角有直角缺口  ←→  切带是圆头弧、主形外有光晕
 *   J / P  地面水平分割、正交  ←→  地面斜切、切带偏转
 *
 * 几何以字符串形式产出，React 组件和分享卡接口共用同一份。
 * 两边各画一套迟早会对不上，而分享卡和结果页长得不一样是很难被发现的问题。
 *
 * 全部是内联 SVG 基础图形，不用 mix-blend-mode 这类新特性，老内核也能画对。
 * 颜色是插画自己的调色板，不跟随主题令牌：这张图会被截图外发，
 * 深浅色模式下必须长得一样。
 */

/**
 * 按 SN × TF 分四个色系，同组共享色相，这样 16 张摆在一起是一个系列。
 * 色相选的是四个偏灰的中性色：雾蓝、藕粉、鼠尾草、陶土。
 */
const FAMILY_HUE: Record<string, number> = {
  NT: 226, // 雾蓝
  NF: 342, // 藕粉
  ST: 155, // 鼠尾草
  SF: 28, // 陶土
};

export type Tone = {
  base: string;
  alt: string;
  deep: string;
  ink: string;
  washA: string;
  washB: string;
  /** 卡片底色，比画面里的地更浅一档 */
  card: string;
};

/**
 * 低饱和、高明度的柔和色板。饱和度全部压在 36% 以下，
 * 高饱和在手机上会显得廉价，也压不住大面积铺色。
 */
export function toneFor(code: string): Tone {
  const hue = FAMILY_HUE[`${code[1]}${code[2]}`] ?? FAMILY_HUE.NT;
  // 同色系内按 E/I 与 J/P 再分四档，避免四张撞脸
  const variant = (code[0] === "E" ? 0 : 2) + (code[3] === "J" ? 0 : 1);
  // 色相只在小范围内挪，挪多了陶土会飘成橄榄绿
  const shift = [-5, 5, -2, 8][variant];
  const sat = [32, 27, 23, 36][variant];
  const light = [66, 62, 70, 60][variant];
  const h = (hue + shift + 360) % 360;

  return {
    base: `hsl(${h}, ${sat}%, ${light}%)`,
    alt: `hsl(${h}, ${sat - 4}%, ${light + 14}%)`,
    // 套印色：交叠处压出来的第三个颜色。
    // 压明度要克制，暖色系压太深会直接变成褐色。靠提饱和拉开层次。
    deep: `hsl(${h}, ${sat + 20}%, ${Math.max(38, light - 17)}%)`,
    ink: `hsl(${h}, ${sat}%, 34%)`,
    washA: `hsl(${h}, ${sat - 8}%, 93%)`,
    washB: `hsl(${h}, ${sat - 6}%, 86%)`,
    card: `hsl(${h}, ${sat - 10}%, 96%)`,
  };
}

/**
 * 画面几何。返回 svg 标签里的内容，不含标签本身。
 * 全部由类型码推导，不含任何外部输入。
 */
export function typeArtMarkup(code: string): string {
  const outward = code[0] === "E";
  const angular = code[1] === "S";
  const sharp = code[2] === "T";
  const aligned = code[3] === "J";

  const t = toneFor(code);
  const id = `art-${code}`;

  // 主形。向外的做大到冲出右上两边，向内的收小并让出四周
  const r = outward ? 178 : 100;
  const cx = outward ? 268 : 192;
  const cy = outward ? 150 : 196;
  const rx = outward ? 18 : 12;

  // 带子横穿主形，交叠处套印
  const bandY = outward ? 208 : 236;
  const bandH = outward ? 86 : 64;
  const bandTilt = aligned ? 0 : -12;
  const bandMid = bandY + bandH / 2;

  const mainShape = (fill: string) =>
    angular
      ? `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${rx}" fill="${fill}"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

  // 切带：锐利的是硬边直条，柔和的是圆头弧
  const band = (color: string) =>
    sharp
      ? `<rect x="-60" y="${bandY}" width="520" height="${bandH}" fill="${color}"/>`
      : `<path d="M -60 ${bandMid + 58} Q 200 ${bandMid - 112} 460 ${bandMid + 58}" fill="none" stroke="${color}" stroke-width="${bandH}" stroke-linecap="round"/>`;

  const halo = angular
    ? `<rect x="${cx - r - 26}" y="${cy - r - 26}" width="${(r + 26) * 2}" height="${(r + 26) * 2}" rx="${rx + 12}" fill="none" stroke="${t.alt}" stroke-width="9" opacity="0.55"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r + 26}" fill="none" stroke="${t.alt}" stroke-width="9" opacity="0.55"/>`;

  const clipShape = angular
    ? `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${rx}"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;

  return `
  <defs>
    <clipPath id="${id}-frame"><rect x="0" y="0" width="400" height="400"/></clipPath>
    <clipPath id="${id}-main">${clipShape}</clipPath>
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${t.alt}"/>
      <stop offset="100%" stop-color="${t.base}"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#${id}-frame)">
    <rect x="0" y="0" width="400" height="400" fill="${t.washA}"/>
    ${
      aligned
        ? `<rect x="0" y="258" width="400" height="142" fill="${t.washB}"/>`
        : `<path d="M 0 300 L 400 196 L 400 400 L 0 400 Z" fill="${t.washB}"/>`
    }
    ${sharp ? "" : halo}
    ${mainShape(`url(#${id}-fill)`)}
    <g transform="rotate(${bandTilt} 200 ${bandMid})">
      <g opacity="0.92">${band(t.base)}</g>
      <g clip-path="url(#${id}-main)">${band(t.deep)}</g>
    </g>
    ${
      sharp
        ? `<rect x="0" y="0" width="${outward ? 104 : 80}" height="${outward ? 104 : 80}" fill="${t.deep}" opacity="0.9"/>`
        : ""
    }
    ${
      outward
        ? ""
        : aligned
          ? `<rect x="0" y="368" width="400" height="6" fill="${t.deep}" opacity="0.55"/>`
          : `<path d="M 0 380 L 400 344" stroke="${t.deep}" stroke-width="6" opacity="0.5"/>`
    }
  </g>`;
}
