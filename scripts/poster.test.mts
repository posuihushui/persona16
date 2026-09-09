import assert from "node:assert/strict";
import test from "node:test";
import { loadPack } from "../src/lib/content.ts";
import { posterCardMarkup, wrapText, posterAxes, POSTER_GOLD } from "../src/lib/poster.ts";
import type { Dimension, DimensionScore } from "../src/lib/types.ts";

/**
 * 分享卡的版面不变量。
 *
 * 这张卡是塞进 <img> 再画进 canvas 的，排版错了不会报错，只会安静地画歪，
 * 而它正是最容易被外发出去的那张图。所以把「标签压不到走马带上」
 * 「不许超出画布」这类事情固定下来，而不是每次改完用眼睛看。
 *
 * 这里不引用真的主视觉和色板：要验的是版面算得对不对，主视觉换成什么都一样。
 * 用假的几何和固定色板，这组测试就不会因为主视觉在改而跟着红。
 */

/** 占位几何。真正的 typeArtMarkup 画什么，与版面无关。 */
const ART = '<rect x="0" y="0" width="400" height="400" fill="#eee"/>';

/** 固定色板。字段与 toneFor 的返回一致。 */
const TONE = { card: "#f6f3f4", ink: "#5b4650", deep: "#7a4f60", base: "#c48d9e", washB: "#e8dade" };

const pack = loadPack("persona16");
const codes = Object.keys(pack.results).sort();
const CANVAS = 900;
const RIGHT = 836;

function card(code: string) {
  const doc = pack.results[code];
  return posterCardMarkup({
    code: doc.code,
    name: doc.name,
    label: doc.label,
    creed: doc.creed,
    creedLabel: "人生信条",
    tags: doc.tags,
    brand: pack.meta.name,
    ring: "16型人格测试　·　16型人格测试　·　",
    tone: TONE,
    artMarkup: ART,
  });
}

/** 标签胶囊：外层 g 的位移加上 rect 自己的宽高就是它在画布上的位置 */
function pills(svg: string) {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  const re = /<g transform="translate\(([\d.]+) ([\d.]+)\)">\s*<rect x="0" y="0" rx="\d+" width="([\d.]+)" height="([\d.]+)"/g;
  for (let m = re.exec(svg); m; m = re.exec(svg)) {
    out.push({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] });
  }
  return out;
}

function bandTop(svg: string) {
  const m = /<clipPath id="band"><rect x="0" y="(\d+)"/.exec(svg);
  assert.ok(m, "分享卡必须有走马带的裁剪区");
  return +m[1];
}

test("16 张分享卡的标签都排在走马带上方且不出画布", () => {
  for (const code of codes) {
    const svg = card(code);
    const band = bandTop(svg);
    const boxes = pills(svg);
    assert.ok(boxes.length >= 4, `${code} 的标签太少: ${boxes.length}`);
    for (const box of boxes) {
      assert.ok(box.y + box.h <= band, `${code} 的标签压到走马带上: ${box.y + box.h} > ${band}`);
      assert.ok(box.x + box.w <= RIGHT, `${code} 的标签超出右边界: ${box.x + box.w} > ${RIGHT}`);
      assert.ok(box.x >= 0 && box.y >= 0, `${code} 的标签跑到画布外`);
    }
  }
});

test("分享卡带上信条、类型码、名字和一句标签", () => {
  for (const code of codes) {
    const doc = pack.results[code];
    const svg = card(code);
    assert.ok(svg.includes(doc.creed), `${code} 缺信条`);
    assert.ok(svg.includes(doc.name), `${code} 缺类型名`);
    assert.ok(svg.includes(`>${doc.code}<`), `${code} 缺类型码`);
    for (const line of wrapText(doc.label, 20)) assert.ok(svg.includes(line), `${code} 缺 label`);
    assert.ok(svg.includes(POSTER_GOLD), `${code} 缺印章的品牌金`);
    assert.ok(svg.includes(`viewBox="0 0 ${CANVAS} 1200"`), `${code} 画布尺寸不对`);
  }
});

test("分享卡不含任何付费正文，也不含任何一次作答的数据", () => {
  for (const code of codes) {
    const doc = pack.results[code] as unknown as Record<string, unknown>;
    const svg = card(code);
    for (const field of pack.paywall.paid) {
      const value = doc[field];
      const probe = typeof value === "string" ? value.slice(0, 24) : null;
      if (probe) assert.ok(!svg.includes(probe), `${code} 的分享卡漏出了付费字段 ${field}`);
    }
    /*
     * 公开卡会被转发，不能出现四条轴的位置。
     * 只看真正会被读出来的文字节点——颜色值里的 hsl(...%) 不算数据泄漏。
     */
    const rendered = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join("\u0000");
    assert.ok(!/\d+\s*%/.test(rendered), `${code} 的分享卡上印出了百分比`);
  }
});

test("标签特别长时自动减条数，不和上面的文字叠在一起", () => {
  const long = ["一二三四五六七八九十一二", "一二三四五六七八九十一三", "一二三四五六七八九十一四", "一二三四五六七八九十一五", "一二三四五六七八九十一六", "一二三四五六七八九十一七"];
  const svg = posterCardMarkup({
    code: "INFP", name: "内燃灯",
    label: "这是一句被刻意写到需要断成三行的很长很长的类型描述文字用来压测版面",
    creed: "意义比有用重要", creedLabel: "人生信条", tags: long,
    brand: "16型人格测试", ring: "测试", tone: TONE, artMarkup: ART,
  });
  const band = bandTop(svg);
  const boxes = pills(svg);
  assert.ok(boxes.length >= 2, "至少要留两条标签");
  assert.ok(boxes.length < long.length, "排不下的时候应该减少条数");
  for (const box of boxes) assert.ok(box.y + box.h <= band, "减完之后仍然不能压到走马带");
});

test("公开卡没有作答时不画四条轴", () => {
  const dims = pack.scoring.dimensions as Dimension[];
  assert.deepEqual(posterAxes(dims, undefined), []);
  assert.deepEqual(posterAxes(dims, []), []);
  const scores = [
    { id: dims[0].id, pole: dims[0].positivePole, percent: 78 } as DimensionScore,
  ];
  const axes = posterAxes(dims, scores);
  assert.equal(axes.length, 1);
  assert.equal(axes[0].percent, 78);
  assert.equal(axes[0].hitRight, false);
});

/**
 * 海报小字的对比度。
 *
 * 海报的颜色不跟随主题令牌，所以深浅色模式都靠这一套色板自己成立。
 * 套印色（tone.deep）的明度随色系在 38% 到 70% 之间浮动，16 个类型里有 10 个
 * 拿它当 11px 小字的颜色达不到 AA，最差的只有 2.2:1；tone.ink 的明度固定 34%，
 * 全部在 4.9:1 以上。这条测试盯住的就是「别再把小字改回套印色」。
 */
function srgbFromHsl(value: string): [number, number, number] {
  const [h, s, l] = (value.match(/[\d.]+/g) ?? []).map(Number);
  const S = s / 100;
  const L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const l1 = relativeLuminance(srgbFromHsl(a));
  const l2 = relativeLuminance(srgbFromHsl(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

test("16 套海报色板的小字颜色都达到 AA", async () => {
  const { toneFor } = await import("../src/lib/type-art.ts");
  for (const code of codes) {
    const tone = toneFor(code);
    const ratio = contrast(tone.card, tone.ink);
    assert.ok(ratio >= 4.5, `${code} 的海报小字只有 ${ratio.toFixed(2)}:1，达不到 AA`);
  }
});
