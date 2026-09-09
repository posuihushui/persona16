/**
 * 16 只类型动物。
 *
 * 每个类型一只动物，侧身站在一条地面线上，手里拿着一件说明它做什么的道具。
 * 扁平矢量：一个剪影、两三块色、一圈深色描边，边缘补几笔短线做手绘感。
 * 不用渐变、不用滤镜、不用 mix-blend-mode，老内核也能画对。
 *
 * 为什么是动物而不是抽象几何：抽象构成在 44px 的矩阵页里只能靠方圆大小区分，
 * 四个字母的差异都挤在形状上，同色系里很容易撞脸。动物换成剪影区分，
 * 长耳、长颈、壳、鳍在 40px 上依然认得出来，而且用户会记住"我是那只水獭"。
 *
 * 动物的选法对应类型的行为倾向，不对应任何一位画师已有的角色设定。
 *
 * 这里不导入 type-art.ts，颜色由调用方传进来，避免循环依赖。
 */

export type CreatureInk = {
  /** 身体主色 */
  body: string;
  /** 肚子、耳内、高光这类浅一档的地方 */
  light: string;
  /** 背部、阴影、纹样这类深一档的地方 */
  deep: string;
  /** 道具用的暖金色。16 只共用同一个，整套图才有共同的落点 */
  accent: string;
  /** 道具的第二个颜色，压边和阴影用 */
  accentDeep: string;
  /** 描边与眼睛 */
  ink: string;
  /** 纸色 */
  paper: string;
};

/* ------------------------------------------------------------------ *
 * 画笔
 * ------------------------------------------------------------------ */

/** 深色描边的通用属性。所有形共用一套线宽，画面才像一套。 */
function S(k: CreatureInk, w = 5): string {
  return `stroke="${k.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
}

/** 椭圆。 */
function ell(cx: number, cy: number, rx: number, ry: number, fill: string, k: CreatureInk, rot = 0, w = 5): string {
  const t = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : "";
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${S(k, w)}${t}/>`;
}

/** 闭合路径。 */
function path(d: string, fill: string, k: CreatureInk, w = 5): string {
  return `<path d="${d}" fill="${fill}" ${S(k, w)}/>`;
}

/** 不描边的形。用于叠在剪影内部的纹样，描了边会把画面弄脏。 */
function fillOnly(d: string, fill: string): string {
  return `<path d="${d}" fill="${fill}"/>`;
}

/** 眼睛。一颗深色圆点加一点高光，所有动物共用，眼神才统一。 */
function eye(cx: number, cy: number, r: number, k: CreatureInk): string {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${k.ink}"/>` +
    `<circle cx="${cx + r * 0.32}" cy="${cy - r * 0.36}" r="${r * 0.3}" fill="${k.paper}"/>`
  );
}

/** 闭着的眼。一段下弯的弧，用在安静的那几只身上。 */
function eyeShut(cx: number, cy: number, r: number, k: CreatureInk): string {
  return `<path d="M ${cx - r} ${cy} Q ${cx} ${cy + r * 0.9} ${cx + r} ${cy}" fill="none" ${S(k, 4)}/>`;
}

/**
 * 手绘短线。参照那种在剪影外侧扫几笔的画法，
 * 每笔从 (x,y) 沿角度画一小段，长度略有差别，太整齐就没有手绘味了。
 */
function ticks(marks: Array<[number, number, number, number]>, k: CreatureInk): string {
  return marks
    .map(([x, y, deg, len]) => {
      const rad = (deg * Math.PI) / 180;
      const x2 = x + Math.cos(rad) * len;
      const y2 = y + Math.sin(rad) * len;
      return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${k.ink}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
    })
    .join("");
}

/**
 * 肢体。腿、脖子、触手都用它。
 *
 * 先把所有笔画用描边色画一遍粗的，再用身体色画一遍细的，
 * 两遍之间不穿插，画出来就是一组带外轮廓、彼此相连的肢体。
 * 用分开的矩形拼腿试过一版，四条腿会各自飘在身子外面，接不上。
 */
function limbs(ds: string[], k: CreatureInk, outer = 24, inner = 16, fill?: string): string {
  const c = fill ?? k.body;
  return (
    ds.map((d) => `<path d="${d}" fill="none" ${S(k, outer)}/>`).join("") +
    ds
      .map(
        (d) =>
          `<path d="${d}" fill="none" stroke="${c}" stroke-width="${inner}" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
      .join("")
  );
}

/**
 * 一盏灯。三个类型的标签里都有光（内燃灯、点灯人、守夜人），
 * 所以灯要能复用，也要能靠姿势区分：兔子抱在胸前，马挑在杆头，河狸放在脚边。
 */
function lamp(x: number, y: number, scale: number, k: CreatureInk): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M -8 -34 Q 0 -48 8 -34" fill="none" ${S(k, 4)}/>
    <path d="M -16 -34 L 16 -34 L 16 -26 L -16 -26 Z" fill="${k.accentDeep}" ${S(k, 4)}/>
    <path d="M -13 -26 L 13 -26 L 18 14 L -18 14 Z" fill="${k.accent}" ${S(k, 4)}/>
    <path d="M -20 14 L 20 14 L 20 22 L -20 22 Z" fill="${k.accentDeep}" ${S(k, 4)}/>
    <line x1="-30" y1="-16" x2="-42" y2="-22" stroke="${k.accent}" stroke-width="4" stroke-linecap="round"/>
    <line x1="30" y1="-16" x2="42" y2="-22" stroke="${k.accent}" stroke-width="4" stroke-linecap="round"/>
  </g>`;
}

/** 一簇火星。ENFP 手里那点东西。 */
function spark(x: number, y: number, k: CreatureInk): string {
  const arms = [0, 60, 120, 180, 240, 300]
    .map((deg) => {
      const r = (deg * Math.PI) / 180;
      return `<line x1="${(x + Math.cos(r) * 12).toFixed(1)}" y1="${(y + Math.sin(r) * 12).toFixed(1)}" x2="${(x + Math.cos(r) * 26).toFixed(1)}" y2="${(y + Math.sin(r) * 26).toFixed(1)}" stroke="${k.accent}" stroke-width="5" stroke-linecap="round"/>`;
    })
    .join("");
  return `${arms}<circle cx="${x}" cy="${y}" r="11" fill="${k.accent}" ${S(k, 4)}/>`;
}

/* ------------------------------------------------------------------ *
 * 每只动物手里的道具都对应它的类型标签，不是随便配的：
 * 内燃灯提灯、远眺者拿望远镜、拆解手拿扳手、织网人抱线团。
 * 标签在 content/tests/persona16/results/*.json 的 label 字段。
 * ------------------------------------------------------------------ */

/* ---------------------------- NF 藕粉 ---------------------------- */

/** INFP 内燃灯 · 兔。灯提在胸前，照的是自己心里那点东西。 */
function rabbit(k: CreatureInk): string {
  return [
    ell(140, 300, 22, 22, k.light, k),
    `<g transform="rotate(-11 245 148)">${path("M 232 200 L 232 104 Q 232 90 245 90 Q 258 90 258 104 L 258 200 Z", k.body, k)}</g>`,
    `<g transform="rotate(13 277 154)">${path("M 265 204 L 265 112 Q 265 98 277 98 Q 289 98 289 112 L 289 204 Z", k.body, k)}</g>`,
    `<g transform="rotate(-11 245 148)">${fillOnly("M 239 188 L 239 112 Q 239 103 245 103 Q 251 103 251 112 L 251 188 Z", k.light)}</g>`,
    `<g transform="rotate(13 277 154)">${fillOnly("M 271 192 L 271 120 Q 271 111 277 111 Q 283 111 283 120 L 283 192 Z", k.light)}</g>`,
    ell(196, 288, 62, 56, k.body, k),
    fillOnly("M 210 260 a 42 40 0 1 0 0.1 0 Z", k.light),
    ell(228, 332, 38, 15, k.light, k),
    ell(252, 210, 45, 43, k.body, k),
    fillOnly("M 286 226 a 21 18 0 1 0 0.1 0 Z", k.light),
    eye(266, 202, 7, k),
    `<path d="M 294 217 l 12 -6 l -2 12 Z" fill="${k.ink}"/>`,
    `<path d="M 289 234 Q 295 241 302 236" fill="none" ${S(k, 4)}/>`,
    // 提灯的两只前爪
    `<path d="M 178 288 Q 190 306 208 308" fill="none" ${S(k, 10)}/>`,
    `<path d="M 246 288 Q 238 306 222 308" fill="none" ${S(k, 10)}/>`,
    lamp(214, 300, 1, k),
    ticks(
      [
        [231, 96, -100, 16],
        [288, 104, -64, 14],
        [136, 278, 202, 15],
        [172, 340, 0, 18],
      ],
      k,
    ),
  ].join("");
}

/** INFJ 深水区 · 鲸。浮着，喷一道水，话不多但每次都往深处去。 */
function whale(k: CreatureInk): string {
  return [
    path("M 128 232 L 74 186 Q 56 228 82 248 Q 56 270 78 306 L 134 266 Z", k.deep, k),
    path(
      "M 302 244 Q 304 182 226 174 Q 138 168 114 230 Q 98 272 138 292 Q 226 316 292 286 Q 308 278 302 244 Z",
      k.body,
      k,
    ),
    // 肚子用椭圆而不是跟着轮廓描。描出去过一次，会从嘴边漏出一块
    `<ellipse cx="204" cy="272" rx="72" ry="25" fill="${k.light}"/>`,
    // 胸鳍。别放在嘴那一侧，放右边会看成伸出来的舌头
    path("M 176 288 Q 178 316 148 316 Q 166 298 168 284 Z", k.deep, k, 4),
    eye(272, 228, 8, k),
    `<path d="M 300 254 Q 276 270 248 262" fill="none" ${S(k, 4)}/>`,
    // 喷出来的水。一道斜的，加几颗散开的水珠。
    // 画成左右对称的两道会被看成一对耳朵，试过两次都是这个结果
    `<path d="M 252 172 Q 250 138 274 108" fill="none" ${S(k, 17)}/>`,
    `<path d="M 252 172 Q 250 138 274 108" fill="none" stroke="${k.light}" stroke-width="10" stroke-linecap="round"/>`,
    `<circle cx="296" cy="96" r="9" fill="${k.light}" ${S(k, 4)}/>`,
    `<circle cx="252" cy="82" r="7" fill="${k.light}" ${S(k, 4)}/>`,
    `<circle cx="318" cy="130" r="6" fill="${k.light}" ${S(k, 4)}/>`,
    ticks(
      [
        [152, 188, -58, 15],
        [124, 300, 186, 14],
        [92, 330, 0, 30],
        [262, 334, 0, 34],
      ],
      k,
    ),
  ].join("");
}

/** ENFJ 点灯人 · 马。灯挑在长杆上，够得着的是别人那一盏。 */
function horse(k: CreatureInk): string {
  return [
    `<path d="M 132 234 Q 96 254 88 306" fill="none" ${S(k, 16)}/>`,
    `<path d="M 132 234 Q 96 254 88 306" fill="none" stroke="${k.deep}" stroke-width="10" stroke-linecap="round"/>`,
    limbs(["M 158 252 L 150 342", "M 194 252 L 200 342", "M 250 252 L 242 342", "M 282 252 L 290 342"], k, 24, 16),
    ell(214, 246, 88, 54, k.body, k),
    fillOnly("M 222 260 a 66 36 0 1 0 0.1 0 Z", k.light),
    // 鬃毛先画，压在脖子后面才是鬃毛，画在上面就成了一根管子
    path("M 292 104 Q 258 150 254 226 Q 272 232 282 208 Q 290 150 312 116 Z", k.deep, k, 4),
    limbs(["M 268 242 Q 292 190 302 152"], k, 50, 42),
    ell(320, 138, 48, 31, k.body, k, -22),
    fillOnly("M 348 152 a 20 15 0 1 0 0.1 0 Z", k.light),
    path("M 298 116 Q 292 90 306 76 L 318 104 Z", k.body, k, 4),
    path("M 326 112 Q 334 88 352 80 L 342 110 Z", k.body, k, 4),
    eye(326, 130, 7, k),
    `<path d="M 356 150 Q 364 156 358 164" fill="none" ${S(k, 4)}/>`,
    `<path d="M 352 166 Q 344 174 334 170" fill="none" ${S(k, 4)}/>`,
    `<line x1="122" y1="336" x2="208" y2="118" stroke="${k.ink}" stroke-width="6" stroke-linecap="round"/>`,
    lamp(212, 128, 1.1, k),
    ticks(
      [
        [304, 72, -96, 15],
        [354, 76, -66, 14],
        [92, 250, 196, 15],
        [200, 344, 0, 26],
      ],
      k,
    ),
  ].join("");
}

/** ENFP 火花机 · 松鼠。手里那点火星一直没灭过，尾巴比身子还大。 */
function squirrel(k: CreatureInk): string {
  return [
    path(
      "M 178 326 Q 92 320 78 230 Q 66 134 158 110 Q 212 98 218 140 Q 222 172 190 174 Q 132 180 132 238 Q 132 292 184 296 Q 216 300 212 320 Q 208 338 178 326 Z",
      k.deep,
      k,
    ),
    fillOnly("M 168 300 Q 116 288 118 234 Q 120 166 178 142 Q 132 180 130 238 Q 128 288 168 300 Z", k.body),
    ell(214, 288, 52, 56, k.body, k),
    fillOnly("M 226 268 a 36 40 0 1 0 0.1 0 Z", k.light),
    ell(238, 336, 32, 13, k.light, k),
    ell(248, 206, 40, 39, k.body, k),
    path("M 222 178 L 214 138 L 250 164 Z", k.body, k, 4),
    path("M 268 166 L 278 128 L 294 170 Z", k.body, k, 4),
    fillOnly("M 280 222 a 18 16 0 1 0 0.1 0 Z", k.light),
    eye(264, 198, 7, k),
    `<path d="M 290 214 l 11 -5 l -2 11 Z" fill="${k.ink}"/>`,
    // 举着的火花棒
    `<path d="M 268 272 Q 288 268 302 254" fill="none" ${S(k, 10)}/>`,
    `<line x1="296" y1="262" x2="330" y2="212" stroke="${k.accentDeep}" stroke-width="7" stroke-linecap="round"/>`,
    spark(334, 204, k),
    ticks(
      [
        [216, 134, -96, 14],
        [288, 126, -70, 14],
        [82, 214, 190, 16],
        [196, 342, 0, 24],
      ],
      k,
    ),
  ].join("");
}

/* ---------------------------- NT 雾蓝 ---------------------------- */

/** INTJ 远眺者 · 鹤。单腿站着，望远镜先架上，再决定要不要动。 */
function crane(k: CreatureInk): string {
  return [
    limbs(["M 190 286 L 186 344", "M 214 286 Q 238 312 216 328"], k, 14, 8),
    path("M 132 258 Q 96 244 82 206 Q 120 240 146 234 Z", k.deep, k, 4),
    ell(190, 256, 60, 42, k.body, k),
    fillOnly("M 194 250 a 42 30 0 1 0 0.1 0 Z", k.light),
    path("M 168 236 Q 214 216 246 244 Q 208 270 168 236 Z", k.deep, k, 4),
    limbs(["M 228 232 Q 260 192 256 146 Q 252 110 274 98"], k, 28, 20),
    ell(286, 96, 26, 22, k.body, k),
    path("M 308 92 L 364 102 L 308 112 Z", k.accent, k, 4),
    `<path d="M 268 78 L 250 58 M 278 74 L 270 52" stroke="${k.deep}" stroke-width="5" stroke-linecap="round"/>`,
    eye(292, 90, 6, k),
    // 望远镜。架在翅膀上，避开脖子那条线
    `<g transform="rotate(-18 174 238)">
      <path d="M 126 224 L 206 218 L 206 250 L 126 254 Z" fill="${k.accent}" ${S(k, 4)}/>
      <path d="M 168 219 L 176 219 L 176 252 L 168 252 Z" fill="${k.accentDeep}"/>
    </g>`,
    ticks(
      [
        [258, 48, -96, 15],
        [124, 228, 190, 15],
        [150, 302, 96, 14],
        [246, 344, 0, 26],
      ],
      k,
    ),
  ].join("");
}

/** INTP 思维矿工 · 章鱼。八条腿各挖各的，头灯一直亮着。 */
function octopus(k: CreatureInk): string {
  const legs = [
    "M 148 266 Q 124 306 96 320 Q 118 338 140 322 Q 158 306 162 280",
    "M 176 278 Q 162 320 142 342",
    "M 210 284 Q 210 320 206 344",
    "M 244 278 Q 262 316 284 336",
    "M 272 262 Q 302 296 336 300 Q 322 322 292 312 Q 268 302 258 276",
  ];
  return [
    ...legs.map((d) => `<path d="${d}" fill="none" ${S(k, 22)}/>`),
    ...legs.map((d) => `<path d="${d}" fill="none" stroke="${k.body}" stroke-width="15" stroke-linecap="round"/>`),
    path("M 128 264 Q 122 138 210 136 Q 296 136 290 264 Q 210 292 128 264 Z", k.body, k),
    fillOnly("M 156 246 Q 152 168 210 166 Q 268 166 264 246 Q 210 264 156 246 Z", k.light),
    // 矿工头灯
    path("M 132 148 Q 128 96 210 94 Q 292 96 288 148 Z", k.deep, k),
    `<circle cx="210" cy="104" r="16" fill="${k.accent}" ${S(k, 4)}/>`,
    `<path d="M 210 104 L 168 44 M 210 104 L 252 44" stroke="${k.accent}" stroke-width="5" opacity="0.75" stroke-linecap="round"/>`,
    // 眼镜
    `<circle cx="176" cy="204" r="24" fill="${k.paper}" ${S(k, 5)}/>`,
    `<circle cx="244" cy="204" r="24" fill="${k.paper}" ${S(k, 5)}/>`,
    `<line x1="200" y1="204" x2="220" y2="204" ${S(k, 5)}/>`,
    eye(178, 206, 8, k),
    eye(246, 206, 8, k),
    // 一条腿举着镐
    `<line x1="316" y1="300" x2="352" y2="216" stroke="${k.accentDeep}" stroke-width="7" stroke-linecap="round"/>`,
    `<path d="M 328 220 Q 352 200 376 220" fill="none" stroke="${k.accent}" stroke-width="10" stroke-linecap="round"/>`,
    ticks(
      [
        [130, 176, 186, 15],
        [292, 178, -6, 15],
        [156, 116, -110, 13],
        [176, 344, 0, 22],
      ],
      k,
    ),
  ].join("");
}

/** ENTP 可能性猎手 · 鹦鹉。网随时挂在手上，看见一个想法就先扑过去。 */
function parrot(k: CreatureInk): string {
  return [
    path("M 178 306 Q 132 344 96 356 Q 124 306 150 288 Z", k.deep, k, 4),
    path("M 196 308 Q 158 352 122 368 Q 146 316 172 294 Z", k.body, k, 4),
    ell(204, 258, 58, 68, k.body, k),
    fillOnly("M 214 250 a 40 52 0 1 0 0.1 0 Z", k.light),
    path("M 178 226 Q 226 224 244 282 Q 216 312 182 288 Z", k.deep, k, 4),
    ell(240, 176, 42, 40, k.body, k),
    // 冠羽
    path("M 226 142 L 214 100 L 248 128 Z", k.accent, k, 4),
    path("M 248 134 L 254 92 L 276 130 Z", k.accent, k, 4),
    // 钩喙
    path("M 272 168 Q 312 164 314 190 Q 312 214 288 206 Q 296 190 272 190 Z", k.accent, k, 4),
    eye(254, 168, 7, k),
    `<path d="M 226 328 L 226 344 M 250 328 L 250 344" ${S(k, 7)}/>`,
    // 捕虫网
    `<line x1="150" y1="300" x2="118" y2="180" stroke="${k.accentDeep}" stroke-width="7" stroke-linecap="round"/>`,
    `<circle cx="110" cy="146" r="38" fill="none" stroke="${k.accent}" stroke-width="7"/>`,
    `<path d="M 78 128 Q 110 178 142 128" fill="none" stroke="${k.accent}" stroke-width="4" opacity="0.8"/>`,
    ticks(
      [
        [216, 96, -100, 14],
        [280, 122, -60, 14],
        [96, 340, 200, 15],
        [214, 346, 0, 26],
      ],
      k,
    ),
  ].join("");
}

/** ENTJ 开路者 · 犀牛。角先到，路后到。 */
function rhino(k: CreatureInk): string {
  return [
    // 披风
    path("M 172 202 Q 112 240 96 328 Q 156 314 186 296 Q 166 250 186 208 Z", k.deep, k),
    `<path d="M 124 250 Q 92 246 78 214 Q 106 240 132 234" fill="${k.deep}" ${S(k, 4)}/>`,
    limbs(["M 152 256 L 146 342", "M 190 256 L 194 342", "M 240 256 L 234 342", "M 272 256 L 278 342"], k, 28, 20),
    ell(202, 254, 92, 58, k.body, k),
    fillOnly("M 212 268 a 68 40 0 1 0 0.1 0 Z", k.light),
    ell(304, 236, 56, 44, k.body, k),
    fillOnly("M 322 250 a 32 26 0 1 0 0.1 0 Z", k.light),
    // 角
    path("M 340 208 Q 344 148 374 116 Q 366 168 358 214 Z", k.light, k, 4),
    path("M 314 206 Q 318 180 332 166 Q 330 192 326 210 Z", k.light, k, 4),
    path("M 274 200 Q 268 176 282 168 L 292 194 Z", k.body, k, 4),
    eye(308, 214, 7, k),
    `<path d="M 348 250 Q 356 256 350 264" fill="none" ${S(k, 4)}/>`,
    `<circle cx="222" cy="244" r="18" fill="${k.accent}" ${S(k, 4)}/>`,
    ticks(
      [
        [374, 112, -78, 15],
        [96, 214, 190, 15],
        [98, 322, 176, 15],
        [214, 346, 0, 28],
      ],
      k,
    ),
  ].join("");
}

/* ---------------------------- ST 鼠尾草 ---------------------------- */

/** ISTJ 压舱石 · 龟。壳里装的是记录，风浪大的时候是它把船压住。 */
function turtle(k: CreatureInk): string {
  return [
    path("M 130 300 L 154 300 L 152 330 L 128 330 Z", k.deep, k, 4),
    path("M 252 300 L 276 300 L 276 330 L 250 330 Z", k.deep, k, 4),
    ell(202, 302, 96, 34, k.light, k),
    path("M 108 300 Q 112 178 202 174 Q 292 178 296 300 Z", k.body, k),
    `<path d="M 136 240 Q 202 218 268 240 M 202 176 L 202 220 M 148 288 L 168 244 M 256 288 L 236 244" fill="none" stroke="${k.deep}" stroke-width="6" stroke-linecap="round"/>`,
    // 头
    ell(322, 262, 40, 32, k.body, k),
    fillOnly("M 330 268 a 26 20 0 1 0 0.1 0 Z", k.light),
    eye(336, 252, 7, k),
    `<path d="M 352 274 Q 360 280 352 286" fill="none" ${S(k, 4)}/>`,
    // 脚边的压舱石
    path("M 66 344 Q 58 308 92 300 Q 124 306 118 344 Z", k.accent, k, 4),
    `<path d="M 78 322 L 108 316" stroke="${k.accentDeep}" stroke-width="5" stroke-linecap="round"/>`,
    ticks(
      [
        [126, 214, 194, 15],
        [196, 168, -90, 14],
        [284, 214, -14, 15],
        [190, 344, 0, 26],
      ],
      k,
    ),
  ].join("");
}

/** ISTP 拆解手 · 水獭。先别解释，让我把它拆开看看。 */
function otter(k: CreatureInk): string {
  return [
    `<g transform="rotate(12 104 316)">${ell(104, 316, 54, 22, k.deep, k)}</g>`,
    ell(196, 278, 62, 64, k.body, k),
    fillOnly("M 210 282 a 42 46 0 1 0 0.1 0 Z", k.light),
    ell(218, 332, 34, 14, k.light, k),
    ell(240, 198, 44, 42, k.body, k),
    ell(214, 170, 15, 15, k.body, k),
    ell(266, 164, 15, 15, k.body, k),
    fillOnly("M 274 216 a 22 18 0 1 0 0.1 0 Z", k.light),
    eye(254, 190, 7, k),
    `<path d="M 284 208 l 12 -6 l -2 12 Z" fill="${k.ink}"/>`,
    `<path d="M 296 222 L 330 214 M 296 230 L 332 232" stroke="${k.ink}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`,
    // 扳手。整件绕自己的中心转，画大一点才看得出是扳手
    `<g transform="rotate(-34 200 292)">
      <path d="M 158 284 L 246 284 L 246 302 L 158 302 Z" fill="${k.accent}" ${S(k, 4)}/>
      <path d="M 158 268 Q 132 293 158 318 L 176 308 Q 164 293 176 278 Z" fill="${k.accent}" ${S(k, 4)}/>
      <path d="M 246 276 Q 274 293 246 310 Z" fill="${k.accentDeep}" ${S(k, 4)}/>
    </g>`,
    // 两只前爪抱在扳手外面
    `<path d="M 164 272 Q 176 300 198 304" fill="none" ${S(k, 13)}/>`,
    `<path d="M 164 272 Q 176 300 198 304" fill="none" stroke="${k.body}" stroke-width="8" stroke-linecap="round"/>`,
    `<path d="M 252 268 Q 244 296 224 302" fill="none" ${S(k, 13)}/>`,
    `<path d="M 252 268 Q 244 296 224 302" fill="none" stroke="${k.body}" stroke-width="8" stroke-linecap="round"/>`,
    ticks(
      [
        [208, 154, -98, 14],
        [270, 146, -68, 14],
        [58, 302, 190, 15],
        [176, 344, 0, 24],
      ],
      k,
    ),
  ].join("");
}

/** ESTJ 总调度 · 公牛。板子上写着谁在什么时候做什么。 */
function bull(k: CreatureInk): string {
  return [
    `<path d="M 118 234 Q 84 238 74 278" fill="none" ${S(k, 14)}/>`,
    `<path d="M 118 234 Q 84 238 74 278" fill="none" stroke="${k.deep}" stroke-width="8" stroke-linecap="round"/>`,
    limbs(["M 158 252 L 152 342", "M 196 252 L 200 342", "M 246 252 L 240 342", "M 278 252 L 284 342"], k, 28, 20),
    ell(206, 250, 86, 56, k.body, k),
    fillOnly("M 216 264 a 62 38 0 1 0 0.1 0 Z", k.light),
    ell(300, 226, 52, 46, k.body, k),
    fillOnly("M 324 242 a 28 22 0 1 0 0.1 0 Z", k.light),
    // 角。短、贴着头、尖朝上。画长了会看成兔耳朵
    `<path d="M 272 194 Q 250 186 246 164 M 330 192 Q 352 184 358 162" fill="none" ${S(k, 16)}/>`,
    `<path d="M 272 194 Q 250 186 246 164 M 330 192 Q 352 184 358 162" fill="none" stroke="${k.light}" stroke-width="10" stroke-linecap="round"/>`,
    eye(308, 210, 7, k),
    `<circle cx="334" cy="238" r="5" fill="${k.ink}"/><circle cx="348" cy="234" r="5" fill="${k.ink}"/>`,
    `<circle cx="340" cy="258" r="15" fill="none" stroke="${k.accent}" stroke-width="6"/>`,
    // 调度板。挪到身子外面，压在身上会把肚子盖掉
    `<g transform="rotate(-10 122 274)">
      <path d="M 84 232 L 160 232 L 160 316 L 84 316 Z" fill="${k.accent}" ${S(k, 4)}/>
      <path d="M 108 232 L 136 232 L 136 220 L 108 220 Z" fill="${k.accentDeep}" ${S(k, 4)}/>
      <path d="M 98 258 L 146 258 M 98 278 L 146 278 M 98 298 L 128 298" stroke="${k.accentDeep}" stroke-width="5" stroke-linecap="round"/>
    </g>`,
    ticks(
      [
        [244, 160, -100, 14],
        [360, 158, -74, 14],
        [76, 274, 186, 15],
        [214, 346, 0, 28],
      ],
      k,
    ),
  ].join("");
}

/** ESTP 临场手 · 袋鼠。计划赶不上变化，那就当场跳。 */
function kangaroo(k: CreatureInk): string {
  return [
    // 尾巴。从身子里长出来，粗到细
    `<path d="M 196 282 Q 128 300 62 296" fill="none" ${S(k, 34)}/>`,
    `<path d="M 196 282 Q 128 300 62 296" fill="none" stroke="${k.deep}" stroke-width="26" stroke-linecap="round"/>`,
    // 后腿
    path("M 176 274 Q 140 314 166 336 L 244 336 Q 252 306 226 284 Z", k.body, k),
    ell(212, 250, 54, 62, k.body, k, -12),
    fillOnly("M 220 264 a 34 42 0 1 0 0.1 0 Z", k.light),
    limbs(["M 246 178 Q 240 152 232 136", "M 276 172 Q 280 146 292 128"], k, 20, 13),
    ell(268, 194, 42, 38, k.body, k, -10),
    fillOnly("M 298 208 a 20 16 0 1 0 0.1 0 Z", k.light),
    eye(282, 182, 7, k),
    `<path d="M 310 200 l 12 -6 l -2 12 Z" fill="${k.ink}"/>`,
    // 前爪与护腕
    `<path d="M 236 246 Q 260 258 280 250" fill="none" ${S(k, 12)}/>`,
    `<path d="M 236 246 Q 260 258 280 250" fill="none" stroke="${k.body}" stroke-width="7" stroke-linecap="round"/>`,
    `<path d="M 252 254 L 268 251" stroke="${k.accent}" stroke-width="14" stroke-linecap="round"/>`,
    `<path d="M 240 148 L 256 138" stroke="${k.accent}" stroke-width="12" stroke-linecap="round"/>`,
    // 动线
    `<path d="M 92 218 L 142 206 M 82 250 L 126 242 M 104 186 L 140 176" stroke="${k.ink}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>`,
    ticks(
      [
        [230, 130, -104, 14],
        [296, 124, -70, 14],
        [60, 280, 194, 15],
        [204, 346, 0, 24],
      ],
      k,
    ),
  ].join("");
}

/* ---------------------------- SF 陶土 ---------------------------- */

/** ISFJ 守夜人 · 河狸。所有人都睡了，灯还在脚边亮着。 */
function beaver(k: CreatureInk): string {
  return [
    // 扁尾巴。贴着地面，一半压在身子后面
    `<g transform="rotate(-10 116 318)">${ell(116, 318, 58, 24, k.deep, k)}</g>`,
    `<path d="M 86 306 L 148 312 M 90 326 L 146 328" stroke="${k.ink}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`,
    ell(212, 286, 62, 58, k.body, k),
    fillOnly("M 226 292 a 40 42 0 1 0 0.1 0 Z", k.light),
    ell(250, 196, 47, 45, k.body, k),
    ell(222, 164, 15, 15, k.body, k),
    ell(278, 162, 15, 15, k.body, k),
    // 围巾。披毯子试过，整块盖上去只会变成一块楔子，围巾只占一条，形干净
    `<path d="M 220 232 Q 250 250 282 234" fill="none" ${S(k, 20)}/>`,
    `<path d="M 220 232 Q 250 250 282 234" fill="none" stroke="${k.deep}" stroke-width="13" stroke-linecap="round"/>`,
    `<path d="M 226 242 Q 214 266 218 288" fill="none" ${S(k, 15)}/>`,
    `<path d="M 226 242 Q 214 266 218 288" fill="none" stroke="${k.deep}" stroke-width="9" stroke-linecap="round"/>`,
    fillOnly("M 286 212 a 22 18 0 1 0 0.1 0 Z", k.light),
    eyeShut(262, 188, 9, k),
    `<path d="M 294 202 l 12 -6 l -2 12 Z" fill="${k.ink}"/>`,
    path("M 280 228 L 298 228 L 296 246 L 282 246 Z", k.paper, k, 4),
    lamp(88, 314, 0.9, k),
    ticks(
      [
        [216, 146, -98, 14],
        [284, 144, -66, 14],
        [66, 294, 190, 15],
        [268, 344, 0, 26],
      ],
      k,
    ),
  ].join("");
}

/** ISFP 体感派 · 猫。讲不出道理，但手一落笔就知道对不对。 */
function cat(k: CreatureInk): string {
  return [
    path("M 152 320 Q 96 320 92 268 Q 96 236 124 232 Q 106 250 110 278 Q 116 306 156 302 Z", k.body, k, 4),
    path("M 168 336 Q 156 268 202 246 Q 250 264 244 336 Z", k.body, k),
    fillOnly("M 206 300 a 30 34 0 1 0 0.1 0 Z", k.light),
    ell(212, 208, 46, 42, k.body, k),
    path("M 176 186 L 168 138 L 210 172 Z", k.body, k, 4),
    path("M 240 170 L 254 130 L 262 184 Z", k.body, k, 4),
    fillOnly("M 178 182 L 174 154 L 196 174 Z", k.light),
    fillOnly("M 244 172 L 252 148 L 256 180 Z", k.light),
    fillOnly("M 220 226 a 22 16 0 1 0 0.1 0 Z", k.light),
    eye(196, 202, 7, k),
    eye(234, 200, 7, k),
    `<path d="M 214 220 l 10 -5 l -1 10 Z" fill="${k.ink}"/>`,
    `<path d="M 216 232 Q 224 240 232 232" fill="none" ${S(k, 4)}/>`,
    `<path d="M 240 216 L 274 208 M 240 226 L 276 228" stroke="${k.ink}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`,
    // 握着的画笔
    `<path d="M 240 286 Q 262 288 274 276" fill="none" ${S(k, 11)}/>`,
    `<line x1="266" y1="284" x2="322" y2="212" stroke="${k.accentDeep}" stroke-width="7" stroke-linecap="round"/>`,
    path("M 316 220 L 340 190 L 348 200 L 326 228 Z", k.accent, k, 4),
    ticks(
      [
        [168, 134, -100, 14],
        [258, 126, -74, 14],
        [92, 262, 190, 15],
        [186, 344, 0, 24],
      ],
      k,
    ),
  ].join("");
}

/** ESFJ 织网人 · 蜜蜂。线从它这里出去，把一屋子人连起来。 */
function bee(k: CreatureInk): string {
  return [
    // 翅膀先画，压在身子下面
    ell(180, 176, 42, 26, k.light, k, -28),
    ell(238, 172, 42, 26, k.light, k, 24),
    ell(210, 244, 66, 62, k.body, k),
    fillOnly("M 168 226 Q 200 214 244 218 L 248 240 Q 200 234 166 246 Z", k.deep),
    fillOnly("M 172 268 Q 210 258 250 264 L 246 286 Q 208 280 178 288 Z", k.deep),
    // 头
    ell(210, 152, 40, 36, k.body, k),
    `<path d="M 190 122 Q 178 92 158 84 M 230 122 Q 244 92 264 84" fill="none" ${S(k, 4)}/>`,
    `<circle cx="156" cy="80" r="8" fill="${k.ink}"/><circle cx="266" cy="80" r="8" fill="${k.ink}"/>`,
    eye(196, 148, 7, k),
    eye(226, 148, 7, k),
    `<path d="M 200 168 Q 210 176 220 168" fill="none" ${S(k, 4)}/>`,
    // 抱着的线团，线一路拉到地面
    ell(288, 296, 34, 34, k.accent, k, 0, 4),
    `<path d="M 262 284 Q 288 302 312 286 M 268 308 Q 290 288 310 306" fill="none" stroke="${k.accentDeep}" stroke-width="4"/>`,
    `<path d="M 254 296 Q 200 322 132 316 Q 86 312 62 340" fill="none" stroke="${k.accent}" stroke-width="5" stroke-linecap="round"/>`,
    `<path d="M 250 276 Q 264 282 268 292" fill="none" ${S(k, 10)}/>`,
    ticks(
      [
        [150, 108, 194, 14],
        [272, 106, -16, 14],
        [212, 312, 90, 14],
        [186, 344, 0, 22],
      ],
      k,
    ),
  ].join("");
}

/** ESFP 现场派 · 火烈鸟。麦克风一到手，气氛就归它管。 */
function flamingo(k: CreatureInk): string {
  return [
    // 腿画长。腿短了整只会看成鹅
    limbs(["M 210 262 L 206 342", "M 234 262 Q 258 296 236 316"], k, 14, 8),
    path("M 148 244 Q 112 228 98 192 Q 134 224 160 220 Z", k.deep, k, 4),
    ell(208, 246, 66, 46, k.body, k),
    fillOnly("M 214 240 a 44 32 0 1 0 0.1 0 Z", k.light),
    path("M 182 222 Q 232 202 266 232 Q 226 258 182 222 Z", k.deep, k, 4),
    // S 形脖子。先向右上再折回左上，弧度放开，收紧会绕成一个圈
    limbs(["M 242 218 Q 270 168 242 130 Q 220 102 190 100"], k, 30, 22),
    ell(176, 96, 28, 24, k.body, k),
    path("M 158 92 L 118 106 Q 110 122 130 124 L 166 108 Z", k.deep, k, 4),
    eye(182, 90, 6, k),
    // 麦克风立在面前，球心放在喙尖下方。放平了喙会正好戳进球里
    `<line x1="88" y1="344" x2="88" y2="204" stroke="${k.ink}" stroke-width="6" stroke-linecap="round"/>`,
    `<path d="M 64 336 L 112 336" stroke="${k.ink}" stroke-width="6" stroke-linecap="round"/>`,
    `<path d="M 88 210 Q 94 192 110 186" fill="none" stroke="${k.ink}" stroke-width="6" stroke-linecap="round"/>`,
    `<circle cx="118" cy="182" r="20" fill="${k.accent}" ${S(k, 4)}/>`,
    `<path d="M 103 174 L 133 169 M 103 186 L 135 181" stroke="${k.accentDeep}" stroke-width="4"/>`,
    `<path d="M 302 194 Q 314 174 302 154 M 324 206 Q 342 174 322 142" fill="none" stroke="${k.ink}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>`,
    ticks(
      [
        [182, 64, -96, 14],
        [150, 224, 190, 15],
        [164, 286, 94, 14],
        [254, 344, 0, 26],
      ],
      k,
    ),
  ].join("");
}

/* ------------------------------------------------------------------ *
 * 登记表
 * ------------------------------------------------------------------ */

const CREATURES: Record<string, (k: CreatureInk) => string> = {
  INFP: rabbit,
  INFJ: whale,
  ENFJ: horse,
  ENFP: squirrel,
  INTJ: crane,
  INTP: octopus,
  ENTP: parrot,
  ENTJ: rhino,
  ISTJ: turtle,
  ISTP: otter,
  ESTJ: bull,
  ESTP: kangaroo,
  ISFJ: beaver,
  ISFP: cat,
  ESFJ: bee,
  ESFP: flamingo,
};

/**
 * 画一只。返回 svg 标签里的内容，不含标签本身，画布是 400×400。
 * 类型码认不出来时给一个中性的形：这个函数在分享卡接口里跑，不能抛。
 */
export function creatureMarkup(code: string, k: CreatureInk): string {
  const draw = CREATURES[code.toUpperCase()];
  if (!draw) return ell(200, 262, 76, 72, k.body, k);
  return draw(k);
}

/** 有角色的类型码，导出给内容校验脚本用。 */
export const DRAWN_CODES = Object.keys(CREATURES);
