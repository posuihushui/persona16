#!/usr/bin/env node
/**
 * 把 16 张类型主视觉导成一张对照图。
 *
 *   npm run export:art [输出路径]
 *
 * 用途是一次看完整套图，判断色板和构成是否成系列。
 * 直接引用 src/lib/type-art.ts，和站上、分享卡用的是同一份几何。
 */
import fs from "node:fs";
import path from "node:path";
import { toneFor, typeArtMarkup } from "../src/lib/type-art.ts";

const RESULTS_DIR = path.join(process.cwd(), "content", "tests", "persona16", "results");

const codes = fs
  .readdirSync(RESULTS_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

const CELL = 300;
const COLS = 4;
const GAP = 14;
const CAPTION = 74;

const rows = Math.ceil(codes.length / COLS);
const width = COLS * CELL + (COLS + 1) * GAP;
const height = rows * CELL + (rows + 1) * GAP;

const font = "PingFang SC, HarmonyOS Sans SC, Microsoft YaHei, sans-serif";

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );

let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${font}">`;
out += `<rect width="${width}" height="${height}" fill="#efedE8"/>`;

codes.forEach((code, i) => {
  const doc = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, `${code}.json`), "utf8")) as {
    name: string;
    label: string;
  };
  const x = GAP + (i % COLS) * (CELL + GAP);
  const y = GAP + Math.floor(i / COLS) * (CELL + GAP);
  const t = toneFor(code);

  out += `<g transform="translate(${x},${y})">`;
  out += `<rect width="${CELL}" height="${CELL}" rx="14" fill="${t.card}"/>`;
  out += `<g transform="scale(${CELL / 400})">${typeArtMarkup(code)}</g>`;
  // 图下面压一条同色底，把说明文字放上去
  out += `<rect y="${CELL - CAPTION}" width="${CELL}" height="${CAPTION}" fill="${t.card}"/>`;
  out += `<text x="18" y="${CELL - 40}" font-size="30" font-weight="700" letter-spacing="-1" fill="${t.ink}">${escapeXml(code)}</text>`;
  out += `<text x="18" y="${CELL - 15}" font-size="16" opacity="0.75" fill="${t.ink}">${escapeXml(doc.name)} · ${escapeXml(doc.label)}</text>`;
  out += `</g>`;
});

out += "</svg>";

const target = process.argv[2] ?? path.join(process.cwd(), "persona16-16types.svg");
fs.writeFileSync(target, out);
console.log(`已导出 ${codes.length} 张：${target}`);
