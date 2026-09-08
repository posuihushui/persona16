/**
 * 情境插画（矢量版）。
 *
 * 内联 SVG 而不是位图，有三个原因：
 *   1. 每张图从 100KB 级降到 2KB 级，微信里首屏不再等图；
 *   2. 任意尺寸都清晰，横幅铺满整块也不糊；
 *   3. 可以给局部加动画（呼吸、飘动、点亮），位图做不到。
 *
 * 颜色写死在这里，不跟随主题令牌：插画会被截图外发，深浅色模式下必须长得一样，
 * 这一点和类型主视觉的处理是一致的（agents.md 原则 25、docs/design/illustrations.md）。
 *
 * 每张图有自己的主色，但共用同一张纸、同一套圆角形体和同一套人物，
 * 所以放在一起仍是一套。画面只解释主题，不表达个人得分，
 * 也不用颜色暗示哪一种偏好更好——同一张图里的两个人永远同样鲜亮。
 *
 * 两种画幅：
 *   square 1:1，用于卡片、目录、答题页这类小尺寸位置；
 *   banner 8:5，两侧补背景与配景，用于正文里铺满整块的章节头图。
 */

const PAPER = "#fbfaf7";

/** 调色板。同一色相给两到三档，浅的铺面、中的填形、深的压边。 */
const C = {
  teal: "#7fc3b4",
  tealDeep: "#3f8f80",
  tealWash: "#e6f3ef",
  tealFloor: "#d3e9e2",

  sky: "#7fb6dd",
  skyDeep: "#4784ae",
  skyWash: "#e8f1fa",
  skyFloor: "#d6e6f6",

  indigo: "#8f97e0",
  indigoDeep: "#5b64bd",
  indigoWash: "#eeeffb",
  indigoFloor: "#dfe1f6",

  rose: "#eb96a4",
  roseDeep: "#c96b7d",
  roseWash: "#fbecef",
  roseFloor: "#f6dbe1",

  coral: "#f0895f",
  coralDeep: "#d16740",

  amber: "#f5b855",
  amberDeep: "#d99429",
  amberWash: "#fdf2e0",
  amberFloor: "#f8e4c4",

  sage: "#a8c977",
  sageDeep: "#77a04d",
  sageWash: "#f0f6e6",
  sageFloor: "#e0edcd",

  ink: "#39424f",
  line: "#5d6b7a",
  cloud: "#ffffff",
};

const SKINS = ["#f7dfc6", "#e8c49f", "#d3a274"];
const HAIRS = ["#3b3038", "#5b3f30", "#2f4a52", "#7a4a3a"];

/**
 * 一个人：头、发、身体、两条带手的胳膊、两只脚。
 * 姿势和配色都是参数，避免每张图重画一遍人。
 */
function Figure({
  x = 0,
  y = 0,
  scale = 1,
  body = C.teal,
  legs = C.ink,
  hair = HAIRS[0],
  skin = SKINS[0],
  flip = false,
  arms = "down",
  tilt = 0,
}: {
  x?: number;
  y?: number;
  scale?: number;
  body?: string;
  legs?: string;
  hair?: string;
  skin?: string;
  flip?: boolean;
  arms?: "down" | "up" | "forward" | "hold" | "wave";
  tilt?: number;
}) {
  // 每种姿势：左手落点、右手落点。胳膊从肩膀画到手，手是一个小圆
  const poses: Record<string, [[number, number], [number, number]]> = {
    down: [[-22, 30], [22, 30]],
    up: [[-26, -6], [26, -6]],
    forward: [[-28, 16], [26, 20]],
    hold: [[-14, 26], [14, 26]],
    wave: [[-22, 30], [27, -12]],
  };
  const [left, right] = poses[arms];

  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale}) rotate(${tilt})`}>
      <path d="M-8 40 L-8 46 M8 40 L8 46" stroke={legs} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="-9" cy="48" rx="6.5" ry="4" fill={legs} />
      <ellipse cx="9" cy="48" rx="6.5" ry="4" fill={legs} />
      {/* 胳膊在身体之前画，肩点被身体盖住，露出的就是小臂和手 */}
      <path
        d={`M-11 10 L${left[0]} ${left[1]} M11 10 L${right[0]} ${right[1]}`}
        stroke={body}
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={left[0]} cy={left[1]} r="3.8" fill={skin} />
      <circle cx={right[0]} cy={right[1]} r="3.8" fill={skin} />
      {/* 身体：肩窄下摆宽的一个形，底边留出腿 */}
      <path d="M-15 42 C-15 18 -10 6 0 6 C10 6 15 18 15 42 Z" fill={body} />
      <circle cx="0" cy="-10" r="13.5" fill={skin} />
      {/* 头发：盖住后脑，留出脸 */}
      <path d="M-13.5 -10 C-13.5 -23 -7 -27 0 -27 C8 -27 14 -21 13.5 -9 C10.5 -16 6 -19 0 -19 C-6.5 -19 -11 -15 -13.5 -10 Z" fill={hair} />
      <circle cx="-4.6" cy="-10" r="1.7" fill={C.ink} />
      <circle cx="4.6" cy="-10" r="1.7" fill={C.ink} />
      <path d="M-3.4 -4 C-1.2 -1.6 1.2 -1.6 3.4 -4" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="-8.6" cy="-5.4" r="2.2" fill={C.rose} opacity="0.55" />
      <circle cx="8.6" cy="-5.4" r="2.2" fill={C.rose} opacity="0.55" />
    </g>
  );
}

function Ground({ tone = C.tealWash }: { tone?: string }) {
  return <ellipse cx="100" cy="170" rx="78" ry="15" fill={tone} />;
}

/** 主体后面的色块。所有画面共用同一个有机形，整组看起来像一套。 */
function Blob({ tone }: { tone: string }) {
  return (
    <path
      d="M40 62 C50 26 96 12 132 25 C168 38 184 74 176 110 C168 146 136 172 100 174 C60 176 28 150 22 118 C17 88 30 78 40 62 Z"
      fill={tone}
    />
  );
}

function Plant({
  x,
  y,
  scale = 1,
  leaf = C.sage,
  leafDeep = C.sageDeep,
  pot = C.amber,
  sway = true,
}: {
  x: number;
  y: number;
  scale?: number;
  leaf?: string;
  leafDeep?: string;
  pot?: string;
  sway?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={sway ? "scene-sway" : undefined}>
        <path d="M0 2 L0 -24" stroke={leafDeep} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M0 -8 C-12 -12 -14 -22 -13 -28 C-4 -26 -1 -17 0 -10 Z" fill={leaf} />
        <path d="M0 -14 C10 -18 13 -27 13 -33 C4 -31 1 -22 0 -16 Z" fill={leafDeep} />
      </g>
      <path d="M-9 0 L9 0 L7 12 L-7 12 Z" fill={pot} />
      <rect x="-10" y="-2.5" width="20" height="4" rx="2" fill={pot} />
    </g>
  );
}

/** 横幅两侧的配景。左边一株植物或几块石头，右边天上一样东西，颜色跟着场景走。 */
function Decor({
  kind,
  accent,
  leaf,
  left = "plant",
}: {
  kind: "sun" | "cloud" | "moon";
  accent: string;
  leaf: string;
  left?: "plant" | "stones";
}) {
  return (
    <>
      {left === "plant" ? (
        <Plant x={26} y={150} scale={1.05} leaf={leaf} pot={accent} />
      ) : (
        <g>
          <ellipse cx="26" cy="152" rx="16" ry="11" fill={leaf} />
          <ellipse cx="44" cy="158" rx="10" ry="7" fill={accent} opacity="0.7" />
          <circle cx="20" cy="128" r="3" fill={accent} opacity="0.6" className="scene-float" />
        </g>
      )}
      <g className="scene-float">
        {kind === "sun" && (
          <>
            <circle cx="288" cy="48" r="16" fill={accent} />
            <path
              d="M288 20 L288 12 M288 84 L288 76 M260 48 L252 48 M324 48 L316 48 M268 28 L262 22 M308 68 L314 74 M308 28 L314 22 M268 68 L262 74"
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}
        {kind === "cloud" && (
          <path
            d="M262 56 C262 46 270 40 280 41 C284 32 298 32 302 41 C312 40 318 47 316 56 C314 63 306 66 298 66 L276 66 C268 66 263 62 262 56 Z"
            fill={C.cloud}
            stroke={accent}
            strokeWidth="2.5"
          />
        )}
        {kind === "moon" && (
          <>
            <circle cx="288" cy="46" r="15" fill={accent} />
            <circle cx="281" cy="42" r="12" fill={PAPER} />
            <circle cx="262" cy="66" r="2.6" fill={accent} />
            <circle cx="308" cy="72" r="2.2" fill={accent} />
          </>
        )}
      </g>
      <circle cx="300" cy="150" r="9" fill={accent} opacity="0.35" />
      <circle cx="282" cy="158" r="5" fill={leaf} opacity="0.5" />
    </>
  );
}

type Scene = {
  /** 横幅的整块底色 */
  band: string;
  /** 主体后面的色块 */
  blob: string;
  /** 地面 */
  ground: string;
  /** 两侧配景的主色 */
  accent: string;
  leaf: string;
  decor: "sun" | "cloud" | "moon";
  /** 左侧配景。画面自己左边已经有东西时用 stones，免得两株植物撞在一起 */
  left?: "plant" | "stones";
  main: React.ReactNode;
};

/** 每个场景的画面。id 与 content/illustrations.json 里的 art 字段一一对应。 */
const SCENES: Record<string, Scene> = {
  // 看见不同情境里的自己：人物与镜中的自己
  discovery: {
    band: C.indigoWash,
    blob: C.skyWash,
    ground: C.indigoFloor,
    accent: C.amber,
    leaf: C.sage,
    decor: "sun",
    left: "stones",
    main: (
      <>
        {/* 镜子：外框、镜面、两道斜的反光。镜中是同一个人，衣服和头发都一样 */}
        <rect x="110" y="28" width="72" height="140" rx="34" fill={C.amber} />
        <rect x="117" y="35" width="58" height="126" rx="28" fill={C.cloud} />
        <rect x="117" y="35" width="58" height="126" rx="28" fill={C.skyWash} />
        <g className="scene-fade">
          <Figure
            x={146}
            y={118}
            scale={0.82}
            body={C.indigo}
            legs={C.indigoDeep}
            hair={HAIRS[0]}
            arms="wave"
            flip
          />
        </g>
        <path d="M126 150 L160 44 M140 156 L152 118" stroke={C.cloud} strokeWidth="7" strokeLinecap="round" opacity="0.75" />
        <Figure x={62} y={118} scale={1} body={C.indigo} legs={C.indigoDeep} hair={HAIRS[0]} arms="wave" />
        <Plant x={26} y={158} scale={0.9} leaf={C.teal} leafDeep={C.tealDeep} pot={C.coral} />
      </>
    ),
  },

  // 精力从哪来：一个人安静看书，一个人在旁边说话
  energy: {
    band: C.amberWash,
    blob: C.roseWash,
    ground: C.amberFloor,
    accent: C.coral,
    leaf: C.sage,
    decor: "cloud",
    main: (
      <>
        <g className="scene-float">
          <path d="M108 26 C126 16 152 22 158 40 C164 58 150 72 132 72 L120 72 L108 82 L112 69 C102 62 100 36 108 26 Z" fill={C.cloud} stroke={C.coral} strokeWidth="3" />
          <path d="M118 44 L148 44 M118 55 L138 55" stroke={C.coral} strokeWidth="4" strokeLinecap="round" />
        </g>
        <Figure x={136} y={118} scale={0.95} body={C.coral} legs={C.coralDeep} hair={HAIRS[3]} skin={SKINS[1]} arms="wave" />
        <Figure x={60} y={118} scale={0.95} body={C.tealDeep} legs={C.ink} hair={HAIRS[2]} arms="hold" tilt={-3} />
        <g transform="rotate(-8 60 138)">
          <rect x="41" y="124" width="38" height="26" rx="4" fill={C.cloud} stroke={C.indigoDeep} strokeWidth="2.5" />
          <rect x="41" y="124" width="19" height="26" fill={C.indigo} opacity="0.35" />
          <path d="M60 124 L60 150" stroke={C.indigoDeep} strokeWidth="2.5" />
        </g>
      </>
    ),
  },

  // 信息怎么接：一个人看细节，一个人看整体
  information: {
    band: C.sageWash,
    blob: C.tealWash,
    ground: C.sageFloor,
    accent: C.sky,
    leaf: C.sage,
    decor: "cloud",
    main: (
      <>
        <path d="M100 154 L100 72" stroke={C.sageDeep} strokeWidth="4" strokeLinecap="round" />
        <g className="scene-sway">
          <path d="M100 106 C78 100 72 80 72 66 C94 68 99 88 100 102 Z" fill={C.sage} />
          <path d="M100 92 C122 86 128 66 128 52 C106 54 101 74 100 88 Z" fill={C.sageDeep} />
          <path d="M100 128 C86 124 82 112 82 104 C93 106 99 118 100 124 Z" fill={C.teal} />
        </g>
        <Figure x={44} y={118} scale={0.9} body={C.sky} legs={C.skyDeep} hair={HAIRS[0]} skin={SKINS[2]} arms="forward" />
        <g className="scene-pulse">
          <circle cx="72" cy="110" r="14" fill={C.cloud} fillOpacity="0.7" stroke={C.amberDeep} strokeWidth="3.5" />
          <path d="M82 120 L92 130" stroke={C.amberDeep} strokeWidth="4" strokeLinecap="round" />
        </g>
        <Figure x={158} y={118} scale={0.9} body={C.rose} legs={C.roseDeep} hair={HAIRS[1]} arms="up" flip />
      </>
    ),
  },

  // 判断靠什么：一杆秤，一头是方块一头是心
  decisions: {
    band: C.indigoWash,
    blob: C.roseWash,
    ground: C.indigoFloor,
    accent: C.amber,
    leaf: C.teal,
    decor: "sun",
    main: (
      <>
        <g className="scene-tip">
          <path d="M44 58 L156 58" stroke={C.line} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M60 58 L60 72 M140 58 L140 72" stroke={C.line} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="44" y="72" width="30" height="26" rx="6" fill={C.indigo} />
          <path d="M139 74 C146 65 159 68 159 78 C159 89 145 96 139 101 C133 96 119 89 119 78 C119 68 132 65 139 74 Z" fill={C.coral} />
        </g>
        <path d="M100 58 L100 76" stroke={C.line} strokeWidth="4" strokeLinecap="round" />
        <Figure x={100} y={124} scale={1} body={C.teal} legs={C.tealDeep} hair={HAIRS[2]} skin={SKINS[1]} arms="up" />
        <Plant x={30} y={160} scale={0.85} leaf={C.sage} pot={C.rose} />
        <Plant x={172} y={160} scale={0.95} leaf={C.teal} leafDeep={C.tealDeep} pot={C.amber} />
      </>
    ),
  },

  // 节奏怎么定：一条排好的路线，和一条边走边看的路线
  rhythm: {
    band: C.skyWash,
    blob: C.amberWash,
    ground: C.skyFloor,
    accent: C.sky,
    leaf: C.sage,
    decor: "sun",
    main: (
      <>
        <path d="M22 152 L84 152 L84 114 L150 114" stroke={C.sky} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M22 152 C56 140 60 104 96 96 C128 89 142 72 178 74" stroke={C.amber} strokeWidth="5" strokeLinecap="round" strokeDasharray="7 9" fill="none" className="scene-dash" />
        <Figure x={60} y={122} scale={0.88} body={C.skyDeep} legs={C.ink} hair={HAIRS[0]} arms="hold" />
        <Figure x={148} y={90} scale={0.84} body={C.amber} legs={C.amberDeep} hair={HAIRS[3]} skin={SKINS[1]} arms="wave" flip />
        <g className="scene-float">
          <rect x="18" y="34" width="48" height="38" rx="9" fill={C.cloud} stroke={C.skyDeep} strokeWidth="3" />
          <path d="M26 47 L58 47 M26 59 L48 59" stroke={C.sky} strokeWidth="4" strokeLinecap="round" />
        </g>
      </>
    ),
  },

  // 认识自己，然后向前一点：照料不同阶段的植物
  growth: {
    band: C.sageWash,
    blob: C.tealWash,
    ground: C.sageFloor,
    accent: C.amber,
    leaf: C.sage,
    decor: "sun",
    main: (
      <>
        <Figure x={54} y={118} scale={0.98} body={C.sage} legs={C.sageDeep} hair={HAIRS[1]} arms="forward" />
        <g className="scene-tip">
          <path d="M80 122 L104 115 L108 128 L84 135 Z" fill={C.sky} />
          <path d="M104 119 C115 119 120 124 122 130" stroke={C.skyDeep} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </g>
        <g className="scene-drop">
          <circle cx="126" cy="140" r="3" fill={C.sky} />
          <circle cx="134" cy="132" r="2.4" fill={C.skyDeep} />
        </g>
        <Plant x={126} y={160} scale={0.6} leaf={C.sage} pot={C.coral} sway={false} />
        <Plant x={152} y={160} scale={0.95} leaf={C.teal} leafDeep={C.tealDeep} pot={C.amber} />
        <Plant x={178} y={160} scale={1.3} leaf={C.sage} leafDeep={C.sageDeep} pot={C.rose} />
      </>
    ),
  },

  // 理解自己，也理解彼此：两个人交换形状不同的对话块
  relationships: {
    band: C.amberWash,
    blob: C.indigoWash,
    ground: C.amberFloor,
    accent: C.rose,
    leaf: C.teal,
    decor: "cloud",
    main: (
      <>
        <Figure x={54} y={122} scale={0.98} body={C.indigo} legs={C.indigoDeep} hair={HAIRS[0]} arms="forward" />
        <Figure x={146} y={122} scale={0.98} body={C.teal} legs={C.tealDeep} hair={HAIRS[3]} skin={SKINS[2]} arms="forward" flip />
        <g className="scene-float">
          <path d="M58 40 C58 30 67 24 80 24 C93 24 102 30 102 40 C102 50 93 56 80 56 L72 56 L60 66 L64 54 C60 51 58 46 58 40 Z" fill={C.cloud} stroke={C.indigoDeep} strokeWidth="3" />
          <circle cx="71" cy="40" r="3.2" fill={C.indigo} />
          <circle cx="80" cy="40" r="3.2" fill={C.indigo} />
          <circle cx="89" cy="40" r="3.2" fill={C.indigo} />
        </g>
        <g className="scene-float-slow">
          <path d="M112 64 C112 55 120 50 131 50 C142 50 150 55 150 64 C150 73 142 78 131 78 L126 78 L114 88 L118 76 C114 73 112 69 112 64 Z" fill={C.cloud} stroke={C.tealDeep} strokeWidth="3" />
          <circle cx="125" cy="64" r="3" fill={C.teal} />
          <circle cx="136" cy="64" r="3" fill={C.teal} />
        </g>
      </>
    ),
  },

  // 喜欢一个人的时候：并肩坐着，中间浮起一颗心
  love: {
    band: C.roseWash,
    blob: C.amberWash,
    ground: C.roseFloor,
    accent: C.rose,
    leaf: C.sage,
    decor: "moon",
    main: (
      <>
        <g className="scene-beat">
          <path d="M100 32 C109 18 128 22 128 40 C128 58 109 68 100 78 C91 68 72 58 72 40 C72 22 91 18 100 32 Z" fill={C.coral} />
          <path d="M88 38 C88 32 92 30 95 33" stroke={C.cloud} strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
        </g>
        <Figure x={78} y={108} scale={0.94} body={C.rose} legs={C.roseDeep} hair={HAIRS[1]} arms="hold" tilt={5} />
        <Figure x={124} y={108} scale={0.94} body={C.indigo} legs={C.indigoDeep} hair={HAIRS[2]} skin={SKINS[1]} arms="hold" flip tilt={-5} />
        {/* 长椅：椅面压在两个人身前，椅腿落到地面上 */}
        <rect x="46" y="138" width="110" height="11" rx="5" fill={C.amber} />
        <rect x="46" y="150" width="110" height="6" rx="3" fill={C.amberDeep} />
        <rect x="56" y="156" width="7" height="14" rx="3" fill={C.amberDeep} />
        <rect x="139" y="156" width="7" height="14" rx="3" fill={C.amberDeep} />
      </>
    ),
  },

  // 工作里的样子：一块看板、一张桌子、一个正在推进的人
  career: {
    band: C.skyWash,
    blob: C.indigoWash,
    ground: C.skyFloor,
    accent: C.sky,
    leaf: C.teal,
    decor: "sun",
    main: (
      <>
        <rect x="94" y="26" width="86" height="70" rx="10" fill={C.cloud} stroke={C.skyDeep} strokeWidth="3" />
        <g className="scene-rise">
          <rect x="106" y="66" width="17" height="22" rx="4" fill={C.sky} />
          <rect x="129" y="52" width="17" height="36" rx="4" fill={C.amber} />
          <rect x="152" y="38" width="17" height="50" rx="4" fill={C.sage} />
        </g>
        <Figure x={58} y={110} scale={0.94} body={C.indigo} legs={C.indigoDeep} hair={HAIRS[0]} skin={SKINS[1]} arms="forward" />
        <rect x="26" y="138" width="98" height="10" rx="4" fill={C.amber} />
        <rect x="34" y="148" width="7" height="20" rx="3" fill={C.amberDeep} />
        <rect x="110" y="148" width="7" height="20" rx="3" fill={C.amberDeep} />
        <rect x="80" y="116" width="32" height="22" rx="4" fill={C.cloud} stroke={C.indigoDeep} strokeWidth="2.5" />
        <rect x="83" y="119" width="26" height="14" rx="2" fill={C.indigo} opacity="0.35" />
      </>
    ),
  },
};

export function hasSceneArt(art: string) {
  return Object.prototype.hasOwnProperty.call(SCENES, art);
}

/**
 * 画面本身。alt 由清单提供，作为 aria-label 挂在 svg 上；
 * 装饰性使用（旁边已有等价文字）传 decorative，转成 aria-hidden。
 */
export function SceneArt({
  art,
  label,
  decorative = false,
  variant = "square",
  className = "",
}: {
  art: string;
  label?: string;
  decorative?: boolean;
  /** banner 是 8:5 的章节头图，两侧补背景与配景；square 是 1:1 的小图 */
  variant?: "square" | "banner";
  className?: string;
}) {
  const scene = SCENES[art];
  if (!scene) return null;

  const wide = variant === "banner";
  const size = wide ? { w: 320, h: 200 } : { w: 200, h: 200 };

  return (
    <svg
      className={`scene-art ${className}`}
      viewBox={`0 0 ${size.w} ${size.h}`}
      width={size.w}
      height={size.h}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <rect width={size.w} height={size.h} rx={wide ? 20 : 24} fill={PAPER} />
      {wide && (
        <>
          <rect width={size.w} height={size.h} rx="20" fill={scene.band} />
          <ellipse cx="160" cy="172" rx="176" ry="26" fill={scene.ground} />
          <Decor kind={scene.decor} accent={scene.accent} leaf={scene.leaf} left={scene.left} />
        </>
      )}
      <g transform={wide ? "translate(60 0)" : undefined}>
        {!wide && <rect width="200" height="200" rx="24" fill={scene.band} />}
        <Blob tone={scene.blob} />
        <Ground tone={scene.ground} />
        {scene.main}
      </g>
    </svg>
  );
}
