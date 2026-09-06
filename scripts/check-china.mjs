#!/usr/bin/env node
/**
 * 国内环境体检。
 *
 *   npm run check:china
 *
 * 站点主要在微信 X5 内核、MIUI 浏览器、华为浏览器、UC 和 QQ 浏览器里打开，
 * 这些内核落后主线好几代，而且国内网络访问不到大部分境外 CDN。
 * 这个脚本检查四类问题：
 *
 *   1. 境外资源引用    国内加载不出来，首屏直接卡住
 *   2. 源码里的高版本特性  超出 .browserslistrc 基线且构建期不会降级的
 *   3. 构建产物里的残留    真正决定线上表现的是产物不是源码
 *   4. 国内适配的必备项    防转码声明、图标、manifest
 *
 * 在某一行写 china-allow 可以跳过该行。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

let errors = 0;
let warnings = 0;
const fail = (msg) => {
  errors++;
  console.error(`  ✗ ${msg}`);
};
const warn = (msg) => {
  warnings++;
  console.warn(`  ! ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

// ---- 1. 境外资源 ----

/** 国内访问不稳定或不可达的域名。命中即阻断。 */
const FOREIGN_HOSTS = [
  ["fonts.googleapis.com", "Google Fonts 国内不可达，用系统字体栈"],
  ["fonts.gstatic.com", "Google Fonts 字体文件国内不可达"],
  ["ajax.googleapis.com", "Google CDN 国内不可达"],
  ["www.google-analytics.com", "GA 国内不可达，用国内统计或自建埋点"],
  ["googletagmanager.com", "GTM 国内不可达"],
  ["doubleclick.net", "国内不可达"],
  ["unpkg.com", "国内访问极不稳定，把依赖打进产物"],
  ["cdn.jsdelivr.net", "国内访问不稳定，把依赖打进产物"],
  ["cdnjs.cloudflare.com", "国内访问不稳定"],
  ["maxcdn.bootstrapcdn.com", "国内访问不稳定"],
  ["kit.fontawesome.com", "国内访问不稳定"],
  ["use.typekit.net", "国内不可达"],
  ["gravatar.com", "国内不可达"],
  ["www.youtube.com/embed", "国内不可达"],
  ["player.vimeo.com", "国内不可达"],
  ["connect.facebook.net", "国内不可达"],
  ["platform.twitter.com", "国内不可达"],
  ["www.recaptcha.net", "国内不可达"],
  ["www.gstatic.com/recaptcha", "国内不可达"],
];

// ---- 2. 高版本特性 ----

/** 相对 Chrome 70 / iOS 12 基线过新，且构建期不会自动降级的写法。 */
const CSS_FEATURES = [
  [/@property\b/, "Chrome 85", "block"],
  [/color-mix\s*\(/, "Chrome 111", "block"],
  [/@layer\b/, "Chrome 99", "block"],
  [/\boklch\s*\(|\boklab\s*\(/, "Chrome 111", "block"],
  [/:has\s*\(/, "Chrome 105", "block"],
  [/@container\b/, "Chrome 105", "block"],
  [/\d(dvh|svh|lvh|dvw|svw|lvw)\b/, "Chrome 108", "block"],
  [/\binset-(block|inline)\b/, "Chrome 87", "block"],
  [/\baspect-ratio\s*:/, "Chrome 88", "warn"],
  [/\baccent-color\s*:/, "Chrome 93", "warn"],
  [/\btext-wrap\s*:/, "Chrome 114", "warn"],
];

/** React 内联样式里的逻辑属性和 flex gap，这两类不会被构建期降级。 */
const INLINE_STYLE_FEATURES = [
  [/paddingBlock|marginBlock|paddingInline|marginInline|insetBlock|insetInline/, "逻辑属性需要 Chrome 87，改用 paddingTop/paddingBottom 这类物理属性"],
  [/display:\s*"flex"[^}]*\bgap:/, "内联的 flex gap 需要 Chrome 84 / iOS 14.5，改用 .row 或 .wrap 类，它们带 @supports 回退"],
];

/** 运行时特性。已在 LegacyPolyfills 里补的记为 warn，其余 block。 */
const JS_FEATURES = [
  [/\bstructuredClone\s*\(/, "Chrome 98，没有补丁", "block"],
  [/\.findLast(Index)?\s*\(/, "Chrome 97，没有补丁", "block"],
  [/AbortSignal\.timeout/, "Chrome 103，没有补丁", "block"],
  [/\bnavigator\.share\s*\(/, "国产内核支持度参差，必须有回退", "warn"],
  [/\.at\s*\(\s*-/, "Chrome 92，已由 LegacyPolyfills 兜住", "warn"],
  [/Object\.hasOwn\s*\(/, "Chrome 93，已由 LegacyPolyfills 兜住", "warn"],
  [/\.replaceAll\s*\(/, "Chrome 85，已由 LegacyPolyfills 兜住", "warn"],
];

/** 把 CSS 注释替换成等量空白，保留行号，避免注释里提到的特性名被误判。 */
function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function scanSources() {
  console.log("源码扫描");

  const sourceFiles = [
    ...walk(path.join(ROOT, "src"), new Set([".ts", ".tsx", ".css"])),
    ...walk(path.join(ROOT, "public"), new Set([".html", ".css", ".js"])),
  ];

  let hits = 0;

  for (const file of sourceFiles) {
    const rel = path.relative(ROOT, file);
    const isCss = file.endsWith(".css");
    const raw = fs.readFileSync(file, "utf8");
    const lines = (isCss ? stripCssComments(raw) : raw).split("\n");

    lines.forEach((line, i) => {
      if (line.includes("china-allow")) return;
      const at = `${rel}:${i + 1}`;

      for (const [host, why] of FOREIGN_HOSTS) {
        if (line.includes(host)) {
          fail(`${at} 引用了境外资源 ${host}。${why}`);
          hits++;
        }
      }

      if (isCss) {
        for (const [re, since, level] of CSS_FEATURES) {
          if (!re.test(line)) continue;
          // globals.css 里的 gap 已经包在 @supports 里，其余按规则报
          const msg = `${at} 使用了 ${since} 才支持的 CSS：${line.trim().slice(0, 70)}`;
          if (level === "block") fail(msg);
          else warn(msg);
          hits++;
        }
      } else {
        for (const [re, why] of INLINE_STYLE_FEATURES) {
          if (re.test(line)) {
            fail(`${at} ${why}`);
            hits++;
          }
        }
        for (const [re, why, level] of JS_FEATURES) {
          if (!re.test(line)) continue;
          const msg = `${at} ${why}：${line.trim().slice(0, 60)}`;
          if (level === "block") fail(msg);
          else warn(msg);
          hits++;
        }
      }
    });
  }

  if (hits === 0) ok(`${sourceFiles.length} 个源码文件，无境外资源，无超出基线的写法`);
}

function scanBuildOutput() {
  console.log("\n构建产物扫描");

  const staticDir = path.join(ROOT, ".next", "static");
  if (!fs.existsSync(staticDir)) {
    warn("找不到 .next/static，先跑 npm run build 再检查产物");
    return;
  }

  const cssFiles = walk(staticDir, new Set([".css"]));
  let cssHits = 0;
  for (const file of cssFiles) {
    const text = stripCssComments(fs.readFileSync(file, "utf8"));
    for (const [re, since, level] of CSS_FEATURES) {
      const m = text.match(new RegExp(re.source, "g"));
      if (!m) continue;
      const msg = `${path.relative(ROOT, file)} 含 ${m.length} 处 ${since} 才支持的 CSS：${m[0]}`;
      if (level === "block") fail(msg);
      else warn(msg);
      cssHits++;
    }
  }
  if (cssHits === 0) {
    const total = cssFiles.reduce((n, f) => n + fs.statSync(f).size, 0);
    ok(`CSS 产物 ${cssFiles.length} 个，共 ${total} 字节，无超出基线的特性`);
  }

  const jsFiles = walk(staticDir, new Set([".js"]));
  let jsHits = 0;
  for (const file of jsFiles) {
    const text = fs.readFileSync(file, "utf8");
    // 只查确实会让老内核抛错的运行时方法，语法层面由 browserslist 降级
    for (const [re, why, level] of JS_FEATURES) {
      if (!re.test(text)) continue;
      const msg = `${path.relative(ROOT, file)} 含 ${why}`;
      if (level === "block") fail(msg);
      else warn(msg);
      jsHits++;
    }
    for (const [host] of FOREIGN_HOSTS) {
      if (text.includes(host)) {
        fail(`${path.relative(ROOT, file)} 打进了境外域名 ${host}`);
        jsHits++;
      }
    }
  }
  if (jsHits === 0) ok(`JS 产物 ${jsFiles.length} 个，无境外域名，无未兜住的运行时特性`);
}

function checkRequiredBits() {
  console.log("\n国内适配必备项");

  const layout = path.join(ROOT, "src", "app", "layout.tsx");
  const layoutText = fs.existsSync(layout) ? fs.readFileSync(layout, "utf8") : "";

  const required = [
    ["no-transform", "防运营商转码声明"],
    ["no-siteapp", "防百度转码声明"],
    ["applicable-device", "百度移动适配声明"],
    ['renderer', "双核浏览器内核选择"],
    ["x5-orientation", "微信 X5 内核方向声明"],
    ["viewportFit", "刘海屏安全区（viewport-fit=cover）"],
    ["LegacyPolyfills", "老内核补丁"],
  ];
  for (const [needle, why] of required) {
    if (layoutText.includes(needle)) ok(why);
    else fail(`layout.tsx 缺少${why}`);
  }

  const css = path.join(ROOT, "src", "app", "globals.css");
  const cssText = fs.existsSync(css) ? fs.readFileSync(css, "utf8") : "";
  if (cssText.includes("@supports (gap")) ok("flex gap 有 @supports 回退");
  else fail("globals.css 缺少 flex gap 的 @supports 回退");
  if (cssText.includes("safe-area-inset")) ok("安全区变量已定义");
  else fail("globals.css 缺少 safe-area-inset 处理");

  for (const icon of ["public/icon-192.png", "public/icon-512.png", "public/apple-touch-icon.png"]) {
    if (fs.existsSync(path.join(ROOT, icon))) ok(`${icon} 存在`);
    else fail(`${icon} 缺失，跑 npm run build:icons`);
  }

  if (fs.existsSync(path.join(ROOT, "src", "app", "manifest.ts"))) ok("manifest 存在，支持添加到桌面");
  else fail("缺少 manifest，国产浏览器添加到桌面会退化成默认图标");

  if (fs.existsSync(path.join(ROOT, ".browserslistrc"))) ok(".browserslistrc 存在，构建会按它降级");
  else fail("缺少 .browserslistrc，构建会按 Next 默认的现代浏览器目标产出");
}

console.log("国内环境体检\n");
scanSources();
scanBuildOutput();
checkRequiredBits();

console.log(`\n体检完成：${errors} 个问题，${warnings} 个提醒`);
if (errors > 0) process.exit(1);
