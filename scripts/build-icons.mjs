#!/usr/bin/env node
/**
 * 生成 PWA 与「添加到桌面」需要的位图图标。
 *
 *   npm run build:icons
 *
 * 国产厂商浏览器（华为、小米、OPPO、vivo、UC、QQ）的添加到桌面都只认位图，
 * SVG 图标在这些环境里会退化成默认的地球图案。
 *
 * 这里手写 PNG 编码，不引入图形库：项目只需要几个纯色加矩形的图标，
 * 为此装一套渲染依赖不划算。图案是四条长度不一的横条，
 * 对应产品里的四个维度倾向条。
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// ---- PNG 编码 ----

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** rgba 是 width*height*4 的 Uint8Array。 */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // 压缩方式
  ihdr[11] = 0; // 滤波方式
  ihdr[12] = 0; // 非隔行

  // 每行前面加一个滤波类型字节，统一用 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- 绘制 ----

const ACCENT = [0x5b, 0x6a, 0xbf];
const DEEP = [0x14, 0x16, 0x2b];

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** 四条维度倾向条的相对长度，与结果页的视觉一致。 */
const BAR_RATIOS = [0.88, 0.56, 0.74, 0.42];

function drawIcon(size) {
  const rgba = new Uint8Array(size * size * 4);

  // 160 度线性渐变，和 .hero 的方向一致
  const rad = ((160 - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const norm = Math.abs(dx) + Math.abs(dy);

  // 条形区域：左右各留 22% 安全边，Android 自适应图标会裁掉外圈
  const barLeft = size * 0.22;
  const barMax = size * 0.56;
  const barHeight = size * 0.055;
  const barGap = size * 0.055;
  const blockHeight = BAR_RATIOS.length * barHeight + (BAR_RATIOS.length - 1) * barGap;
  const barTop = (size - blockHeight) / 2;
  const radius = barHeight / 2;

  /** 采样一个点落在某条圆角横条内的覆盖度。 */
  function barCoverage(px, py) {
    for (let i = 0; i < BAR_RATIOS.length; i++) {
      const top = barTop + i * (barHeight + barGap);
      const bottom = top + barHeight;
      const right = barLeft + barMax * BAR_RATIOS[i];
      if (py < top || py > bottom) continue;

      const cy = (top + bottom) / 2;
      // 两端是半圆
      if (px >= barLeft + radius && px <= right - radius) return 1;
      const cx = px < barLeft + radius ? barLeft + radius : right - radius;
      const d = Math.hypot(px - cx, py - cy);
      if (d <= radius) return 1;
    }
    return 0;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = Math.min(1, Math.max(0, (x * dx + y * dy) / (size * norm) + 0.15));
      const bg = mix(ACCENT, DEEP, t);

      // 2x2 超采样，圆角边缘不至于是锯齿
      let cover = 0;
      for (const oy of [0.25, 0.75]) {
        for (const ox of [0.25, 0.75]) {
          cover += barCoverage(x + ox, y + oy);
        }
      }
      cover /= 4;

      const i = (y * size + x) * 4;
      rgba[i] = Math.round(bg[0] + (255 - bg[0]) * cover);
      rgba[i + 1] = Math.round(bg[1] + (255 - bg[1]) * cover);
      rgba[i + 2] = Math.round(bg[2] + (255 - bg[2]) * cover);
      rgba[i + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}

// ---- 输出 ----

const targets = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/apple-touch-icon.png", 180],
];

fs.mkdirSync("public", { recursive: true });
for (const [file, size] of targets) {
  const png = drawIcon(size);
  fs.writeFileSync(path.join(process.cwd(), file), png);
  console.log(`  ${file}  ${size}x${size}  ${png.length} 字节`);
}
console.log("图标已生成");
