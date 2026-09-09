import { creatureMarkup, type CreatureInk } from "./type-creatures";

/**
 * 类型主视觉。
 *
 * 米色纸底 + 一条地面线 + 一只类型动物。三样东西每张都一样，
 * 所以 16 张摆在一起是一套，而不是 16 张各画各的。动物本身在 type-creatures.ts。
 *
 * 这个文件只管两件事：颜色怎么来，画面怎么拼。
 *
 * 画面以字符串形式产出，React 组件和分享卡接口共用同一份。
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
/** 纸色。和情境插画同一张纸，两套图放在一页上才是同一个世界。 */
const PAPER = "#f3f0e9";

/** 描边与眼睛。近黑但不是纯黑，纯黑在米色纸上会跳出来。 */
const INK = "#2f2b28";

/** 道具的暖金色与它的压边色。16 只共用，是每张图里唯一的暖色。 */
const ACCENT = "#dda03e";
const ACCENT_DEEP = "#b0762a";

/** 地面线的高度。16 只动物都站在这条线上。 */
const GROUND = 346;

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
 * 角色用的颜色。
 *
 * 和 toneFor 同一张色相表，所以类型卡左边的色条、关键词瓦片和这只动物是一家的。
 * 但饱和度比 toneFor 高一档：toneFor 那套是给大面积铺色用的，压到 36% 以下
 * 才不会显得廉价；角色是小面积填充加深色描边，用同样的饱和度会灰掉，
 * 深色描边本身已经把画面压住了。
 */
export function creatureInkFor(code: string): CreatureInk {
  const hue = FAMILY_HUE[`${code[1]}${code[2]}`] ?? FAMILY_HUE.NT;
  const variant = (code[0] === "E" ? 0 : 2) + (code[3] === "J" ? 0 : 1);
  const h = (hue + [-5, 5, -2, 8][variant] + 360) % 360;
  const s = [34, 29, 26, 38][variant];
  const l = [62, 58, 66, 56][variant];

  return {
    body: `hsl(${h}, ${s}%, ${l}%)`,
    light: `hsl(${h}, ${s - 6}%, ${Math.min(92, l + 22)}%)`,
    deep: `hsl(${h}, ${s + 12}%, ${Math.max(30, l - 16)}%)`,
    // 道具色对 16 只是固定的，不跟随色系。
    // 试过按色相取补色，藕粉那组补出来是草绿，灯和橡果都变成了绿的，
    // 和身体颜色直接打架。固定成暖金之后，每张图的视线落点一致，整套也更像一套。
    accent: ACCENT,
    accentDeep: ACCENT_DEEP,
    ink: INK,
    paper: PAPER,
  };
}

/**
 * 画面。返回 svg 标签里的内容，不含标签本身。
 *
 * 米色纸底 + 一条地面线 + 一只动物。三样东西每张都一样，
 * 所以 16 张摆在一起是一套，而不是 16 张各画各的。
 * 全部由类型码推导，不含任何外部输入。
 */
export function typeArtMarkup(code: string): string {
  const k = creatureInkFor(code);
  const id = `art-${code}`;

  return `
  <defs><clipPath id="${id}-frame"><rect x="0" y="0" width="400" height="400"/></clipPath></defs>
  <g clip-path="url(#${id}-frame)">
    <rect x="0" y="0" width="400" height="400" fill="${PAPER}"/>
    <line x1="30" y1="${GROUND}" x2="370" y2="${GROUND}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    ${creatureMarkup(code, k)}
  </g>`;
}
