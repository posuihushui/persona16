#!/usr/bin/env node
/**
 * 主动推送 URL 给搜索引擎。
 *
 *   npm run seo:ping                # 预演，只打印将要推送的地址
 *   npm run seo:ping -- --yes       # 真正推送
 *
 * 国内新站等百度自然抓取很慢，主动推送是最有效的加速手段。
 * IndexNow 一次提交覆盖 Bing 和 Yandex。
 *
 * 需要的环境变量：
 *   NEXT_PUBLIC_SITE_URL   站点地址
 *   BAIDU_PUSH_TOKEN       百度搜索资源平台的推送 token，可选
 *   INDEXNOW_KEY           IndexNow 密钥，可选，同时要把 <key>.txt 放到 public/
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(file) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const raw of fs.readFileSync(full, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
if (!site) {
  console.error("NEXT_PUBLIC_SITE_URL 未配置");
  process.exit(1);
}

/** 直接读内容包生成 URL 列表，与 sitemap 同源，不用把站点跑起来。 */
function collectUrls() {
  const root = path.join(process.cwd(), "content", "tests");
  const urls = [`${site}/`];

  if (!fs.existsSync(root)) return urls;

  for (const slug of fs.readdirSync(root)) {
    const metaPath = path.join(root, slug, "meta.json");
    if (!fs.existsSync(metaPath)) continue;
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (meta.status !== "published") continue;

    urls.push(`${site}/t/${slug}`, `${site}/t/${slug}/type`);

    const resultsDir = path.join(root, slug, "results");
    if (!fs.existsSync(resultsDir)) continue;
    for (const file of fs.readdirSync(resultsDir).sort()) {
      if (!file.endsWith(".json")) continue;
      urls.push(`${site}/t/${slug}/type/${file.replace(/\.json$/, "")}`);
    }
  }

  return urls;
}

async function pushBaidu(urls) {
  const token = process.env.BAIDU_PUSH_TOKEN;
  if (!token) {
    console.log("  跳过百度：未配置 BAIDU_PUSH_TOKEN");
    return;
  }
  const host = new URL(site).host;
  const endpoint = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${token}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: urls.join("\n"),
  });
  const body = await res.text();
  console.log(`  百度 (${host}) ${res.status}: ${body}`);
}

async function pushIndexNow(urls) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.log("  跳过 IndexNow：未配置 INDEXNOW_KEY");
    return;
  }
  const host = new URL(site).host;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `${site}/${key}.txt`,
      urlList: urls,
    }),
  });
  console.log(`  IndexNow ${res.status}${res.status === 200 ? " 已接受" : ` ${await res.text()}`}`);
}

const urls = collectUrls();
console.log(`共 ${urls.length} 个地址：`);
for (const u of urls) console.log(`  ${u}`);
console.log("");

if (!process.argv.includes("--yes")) {
  console.log("这是预演，没有推送。确认后加 --yes 重新执行。");
  process.exit(0);
}

console.log("推送中");
await pushBaidu(urls);
await pushIndexNow(urls);
