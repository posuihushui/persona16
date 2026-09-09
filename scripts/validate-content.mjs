#!/usr/bin/env node
/**
 * 内容包校验。规则见 docs/product/test-pack-spec.md。
 * 这个脚本是提交门槛，不通过不允许交付。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "content", "tests");
const MAX_QUESTION_LENGTH = 30;
const POLE_BALANCE_MIN = 0.4; // 两极题目数比例下限，4:6

let errors = 0;
let warnings = 0;

const fail = (slug, msg) => {
  errors++;
  console.error(`  ✗ [${slug}] ${msg}`);
};
const warn = (slug, msg) => {
  warnings++;
  console.warn(`  ! [${slug}] ${msg}`);
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return { __error: e.message };
  }
}

/**
 * 插画清单里声明的场景名。内容包里的章节只能引用这里有的场景。
 * 清单不存在时（比如换版测试的临时内容根目录）跳过这项检查，不误报。
 */
const sceneNames = (() => {
  const file = path.join(process.cwd(), "content", "illustrations.json");
  if (!fs.existsSync(file)) return null;
  try {
    return new Set(Object.keys(JSON.parse(fs.readFileSync(file, "utf8")).assets ?? {}));
  } catch {
    return null;
  }
})();

function enumerateCodes(scoring) {
  if (scoring.mode !== "dichotomy") return [];
  const order = scoring.codeOrder ?? scoring.dimensions.map((d) => d.id);
  let acc = [""];
  for (const id of order) {
    const dim = scoring.dimensions.find((d) => d.id === id);
    if (!dim) return [];
    acc = acc.flatMap((prefix) => Object.keys(dim.poles).map((p) => prefix + p));
  }
  return acc;
}

function validatePack(slug, dir = path.join(ROOT, slug), expectedSlug = slug, expectedVersion) {
  console.log(`\n检查内容包 ${slug}`);

  for (const f of ["meta.json", "questions.json", "scoring.json", "paywall.json"]) {
    if (!fs.existsSync(path.join(dir, f))) {
      fail(slug, `缺少 ${f}`);
      return;
    }
  }

  const meta = readJson(path.join(dir, "meta.json"));
  const questions = readJson(path.join(dir, "questions.json"));
  const scoring = readJson(path.join(dir, "scoring.json"));
  const paywall = readJson(path.join(dir, "paywall.json"));

  for (const [name, doc] of Object.entries({ meta, questions, scoring, paywall })) {
    if (doc.__error) {
      fail(slug, `${name}.json 不是合法 JSON: ${doc.__error}`);
      return;
    }
  }

  // 版本一致
  if (meta.slug !== expectedSlug || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(meta.slug)) {
    fail(slug, "meta.slug 必须是合法路径标识且与测试目录名一致");
  }
  if (!/^\d+\.\d+\.\d+$/.test(meta.version) || (expectedVersion && meta.version !== expectedVersion)) {
    fail(slug, "meta.version 必须是三段数字版本号，归档版本还须与目录名一致");
  }
  if (meta.version !== questions.version || meta.version !== scoring.version) {
    fail(
      slug,
      `版本号不一致 meta=${meta.version} questions=${questions.version} scoring=${scoring.version}`,
    );
  }

  // 免责声明必填
  if (!meta.disclaimer || meta.disclaimer.length < 20) {
    fail(slug, "meta.disclaimer 缺失或过短，结果页必须展示免责声明");
  }

  // SEO 与 AI 抓取所需的正文
  if (!meta.about || meta.about.length < 100) {
    fail(slug, "meta.about 缺失或过短，落地页需要可被抓取的理论背景正文");
  }
  if (!meta.updatedAt || !/^\d{4}-\d{2}-\d{2}$/.test(meta.updatedAt)) {
    fail(slug, "meta.updatedAt 缺失或格式不是 YYYY-MM-DD，sitemap 需要它做 lastmod");
  }
  const faq = meta.seo?.faq ?? [];
  if (faq.length < 4) {
    fail(slug, `meta.seo.faq 至少要 4 条，当前 ${faq.length} 条`);
  }
  faq.forEach((item, i) => {
    if (!item.q || !item.a) fail(slug, `meta.seo.faq[${i}] 缺少 q 或 a`);
    else if (item.a.length < 20) warn(slug, `meta.seo.faq[${i}] 的答案过短，对搜索和 AI 抓取价值有限`);
  });
  if ((meta.seo?.keywords ?? []).length < 3) {
    fail(slug, "meta.seo.keywords 至少要 3 个");
  }

  // 题目基本约束
  const items = questions.questions ?? [];
  if (meta.questionCount !== items.length) {
    fail(slug, `meta.questionCount=${meta.questionCount} 与题目数 ${items.length} 不一致`);
  }
  const ids = new Set();
  for (const q of items) {
    if (ids.has(q.id)) fail(slug, `题目 id 重复: ${q.id}`);
    ids.add(q.id);
    if (!q.text || q.text.length > MAX_QUESTION_LENGTH) {
      fail(slug, `${q.id} 题干为空或超过 ${MAX_QUESTION_LENGTH} 字: ${q.text?.length ?? 0} 字`);
    }
    if (typeof q.weight !== "number" || q.weight <= 0) {
      fail(slug, `${q.id} weight 必须是正数`);
    }
    const dim = scoring.dimensions.find((d) => d.id === q.dimension);
    if (!dim) {
      fail(slug, `${q.id} 引用了不存在的维度 ${q.dimension}`);
    } else if (!dim.poles[q.pole]) {
      fail(slug, `${q.id} 引用了维度 ${q.dimension} 中不存在的极 ${q.pole}`);
    }
  }

  // 量表
  const scale = questions.scale?.options ?? [];
  if (scale.length < 2) fail(slug, "scale.options 至少要有两个选项");
  if (!scale.some((o) => o.value > 0) || !scale.some((o) => o.value < 0)) {
    fail(slug, "scale 必须同时包含正负取值，否则无法区分两极");
  }

  // 维度平衡
  const perDim = new Map();
  for (const q of items) {
    const bucket = perDim.get(q.dimension) ?? new Map();
    bucket.set(q.pole, (bucket.get(q.pole) ?? 0) + 1);
    perDim.set(q.dimension, bucket);
  }
  const counts = [...perDim.values()].map((b) => [...b.values()].reduce((a, c) => a + c, 0));
  if (new Set(counts).size > 1) {
    fail(slug, `各维度题目数不相等: ${[...perDim.keys()].map((k, i) => `${k}=${counts[i]}`).join(" ")}`);
  }
  for (const [dimId, bucket] of perDim) {
    const dim = scoring.dimensions.find((d) => d.id === dimId);
    if (!dim) continue;
    const total = [...bucket.values()].reduce((a, c) => a + c, 0);
    for (const poleId of Object.keys(dim.poles)) {
      const n = bucket.get(poleId) ?? 0;
      const ratio = n / total;
      if (ratio < POLE_BALANCE_MIN || ratio > 1 - POLE_BALANCE_MIN) {
        fail(slug, `维度 ${dimId} 极 ${poleId} 占比 ${(ratio * 100).toFixed(0)}%，超出 40%-60% 平衡区间`);
      }
    }
  }

  // 维度定义
  for (const dim of scoring.dimensions ?? []) {
    const poles = Object.keys(dim.poles ?? {});
    if (scoring.mode === "dichotomy" && poles.length !== 2) {
      fail(slug, `dichotomy 模式下维度 ${dim.id} 必须正好两极，当前 ${poles.length}`);
    }
    if (!poles.includes(dim.positivePole)) {
      fail(slug, `维度 ${dim.id} 的 positivePole=${dim.positivePole} 不在 poles 中`);
    }
    if (!poles.includes(dim.tieBreak)) {
      fail(slug, `维度 ${dim.id} 的 tieBreak=${dim.tieBreak} 不在 poles 中`);
    }
  }

  // 付费边界
  const free = paywall.free ?? [];
  const paid = paywall.paid ?? [];
  const overlap = free.filter((k) => paid.includes(k));
  if (overlap.length) fail(slug, `free 与 paid 字段重叠: ${overlap.join(", ")}`);

  // 付费墙上的锁定条目
  const locked = paywall.locked ?? [];
  if (locked.length === 0) {
    fail(slug, "paywall.locked 不能为空，付费墙需要告诉用户锁住了什么");
  }
  for (const item of locked) {
    if (!item.key || !item.title || !item.hint) {
      fail(slug, "paywall.locked 每条必须有 key、title 和 hint");
    } else if (!paid.includes(item.key)) {
      fail(slug, `paywall.locked 引用了非付费字段 ${item.key}`);
    }
  }
  const missingLocked = paid.filter((k) => !locked.some((l) => l.key === k));
  if (missingLocked.length) {
    warn(slug, `这些付费字段没有出现在付费墙的锁定清单里: ${missingLocked.join(", ")}`);
  }

  // 折扣
  if (paywall.discount) {
    const d = paywall.discount;
    if (!Number.isFinite(d.percent) || d.percent <= 0 || d.percent >= 100) {
      fail(slug, "discount.percent 必须在 1 到 99 之间，表示折后按原价的百分之多少收");
    }
    if (!Number.isFinite(d.windowHours) || d.windowHours <= 0 || d.windowHours > 168) {
      fail(slug, "discount.windowHours 必须在 1 到 168 之间");
    }
    if (!["share", "timed"].includes(d.trigger)) {
      fail(slug, `discount.trigger 只能是 share 或 timed，当前 ${d.trigger}`);
    }
  }
  if (!paywall.price || typeof paywall.price.amount !== "number") {
    fail(slug, "paywall.price.amount 必须是数字，单位分");
  }
  if (!Array.isArray(paywall.promise) || paywall.promise.length === 0) {
    fail(slug, "paywall.promise 不能为空，合规审查要核对承诺与实际交付");
  }
  if (!paywall.refundNote) fail(slug, "paywall.refundNote 缺失");

  // 结果文件
  const resultsDir = path.join(dir, "results");
  const expected = scoring.mode === "dichotomy" ? enumerateCodes(scoring) : null;
  const present = fs.existsSync(resultsDir)
    ? fs.readdirSync(resultsDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
    : [];

  if (expected) {
    const missing = expected.filter((c) => !present.includes(c));
    const extra = present.filter((c) => !expected.includes(c));
    if (missing.length) fail(slug, `缺少结果文件: ${missing.join(", ")}`);
    if (extra.length) warn(slug, `存在计分不可能命中的结果文件: ${extra.join(", ")}`);
  }

  // 预览必须截自付费字段，否则等于把免费内容又标了一遍
  if (paywall.teaser) {
    if (!paid.includes(paywall.teaser.field)) {
      fail(slug, `teaser.field=${paywall.teaser.field} 必须是付费字段`);
    }
    if (!Number.isInteger(paywall.teaser.chars) || paywall.teaser.chars < 20) {
      fail(slug, "teaser.chars 必须是不小于 20 的整数，太短的预览没有说服力");
    }
    // 预览太长等于把付费正文送出去。按最短的那篇算，预览不得超过它的六成
    const field = paywall.teaser.field;
    let shortest = Infinity;
    let shortestCode = "";
    for (const code of present) {
      const doc = readJson(path.join(resultsDir, `${code}.json`));
      const text = doc?.[field];
      if (typeof text === "string" && text.length < shortest) {
        shortest = text.length;
        shortestCode = code;
      }
    }
    if (Number.isFinite(shortest) && paywall.teaser.chars > shortest * 0.6) {
      fail(
        slug,
        `teaser.chars=${paywall.teaser.chars} 过长：最短的 ${field} 是 ${shortestCode} 的 ${shortest} 字，` +
          `预览不得超过它的六成（${Math.floor(shortest * 0.6)} 字），否则等于把付费正文公开`,
      );
    }
  }


  const requiredKeys = [...free, ...paid];
  const allCodes = new Set(present);
  for (const code of present) {
    const doc = readJson(path.join(resultsDir, `${code}.json`));
    if (doc.__error) {
      fail(slug, `results/${code}.json 不是合法 JSON: ${doc.__error}`);
      continue;
    }
    if (doc.code !== code) fail(slug, `results/${code}.json 的 code 字段是 ${doc.code}，与文件名不一致`);
    for (const key of requiredKeys) {
      const v = doc[key];
      const empty =
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "") ||
        (Array.isArray(v) && v.length === 0);
      if (empty) fail(slug, `results/${code}.json 缺少字段 ${key}`);
    }
    for (const ref of doc.withOthers ?? []) {
      if (!allCodes.has(ref.code)) {
        fail(slug, `results/${code}.json 的 withOthers 引用了不存在的类型 ${ref.code}`);
      }
      if (ref.code === code) {
        warn(slug, `results/${code}.json 的 withOthers 引用了自己`);
      }
    }
    for (const bs of doc.blindSpots ?? []) {
      if (!bs.point || !bs.action) {
        fail(slug, `results/${code}.json 的 blindSpots 每条必须同时有 point 和 action`);
      }
    }

    // 信条与标签：写在公开分享卡上，长度超了会在 900×1200 的卡上排不下
    if (typeof doc.creed !== "string" || doc.creed.trim() === "") {
      fail(slug, `results/${code}.json 缺少 creed`);
    } else if ([...doc.creed].length > 12) {
      fail(slug, `results/${code}.json 的 creed 超过 12 字，分享卡上会被挤断`);
    }
    if (!Array.isArray(doc.tags) || doc.tags.length < 4 || doc.tags.length > 6) {
      fail(slug, `results/${code}.json 的 tags 要 4 到 6 条，当前 ${Array.isArray(doc.tags) ? doc.tags.length : "缺失"}`);
    } else {
      for (const tag of doc.tags) {
        if (typeof tag !== "string" || tag.trim() === "" || [...tag].length > 12) {
          fail(slug, `results/${code}.json 的 tags 每条不超过 12 字: ${tag}`);
        }
      }
      if (new Set(doc.tags).size !== doc.tags.length) {
        fail(slug, `results/${code}.json 的 tags 有重复`);
      }
    }

    // 公开解读：类型页的免费正文，章节结构由内容包声明，页面按顺序渲染
    if (Array.isArray(doc.guide)) {
      if (doc.guide.length < 3) {
        fail(slug, `results/${code}.json 的 guide 至少要 3 节，当前 ${doc.guide.length} 节`);
      }
      const chapterIds = new Set();
      doc.guide.forEach((ch, i) => {
        for (const key of ["id", "nav", "scene", "title", "lead"]) {
          if (typeof ch?.[key] !== "string" || ch[key].trim() === "") {
            fail(slug, `results/${code}.json 的 guide[${i}] 缺少 ${key}`);
          }
        }
        if (ch?.id) {
          if (chapterIds.has(ch.id)) fail(slug, `results/${code}.json 的 guide 章节 id 重复: ${ch.id}`);
          chapterIds.add(ch.id);
          if (!/^[a-z][a-z0-9-]{0,31}$/.test(ch.id)) {
            fail(slug, `results/${code}.json 的 guide 章节 id 必须是合法锚点: ${ch.id}`);
          }
        }
        if (ch?.scene && sceneNames && !sceneNames.has(ch.scene)) {
          fail(slug, `results/${code}.json 的 guide[${i}] 引用了 illustrations.json 里没有的场景 ${ch.scene}`);
        }
        if (!Array.isArray(ch?.paragraphs) || ch.paragraphs.length === 0) {
          fail(slug, `results/${code}.json 的 guide[${i}] 至少要有一段正文`);
        }
        // 版式可以不写（页面会按这一节有什么自己选），写了就必须是四种之一
        if (ch?.layout !== undefined && !["banner", "split", "split-reverse", "plain"].includes(ch.layout)) {
          fail(slug, `results/${code}.json 的 guide[${i}].layout 不是合法版式: ${ch.layout}`);
        }
        if (ch?.nav && ch.nav.length > 6) {
          warn(slug, `results/${code}.json 的 guide[${i}].nav「${ch.nav}」超过 6 字，窄屏目录会挤`);
        }
      });
      // 免费解读和付费正文不能是同一批句子，否则等于把报告免费送出去
      const paidText = paid
        .map((key) => JSON.stringify(doc[key] ?? ""))
        .join("\n");
      for (const ch of doc.guide) {
        for (const para of ch?.paragraphs ?? []) {
          const probe = para.slice(0, 24);
          if (probe.length >= 12 && paidText.includes(probe)) {
            fail(slug, `results/${code}.json 的 guide 与付费字段有整段重复：「${probe}」`);
          }
        }
      }
    }
  }

  if (errors === 0) console.log(`  ✓ ${slug} 通过，${items.length} 题 / ${present.length} 个结果`);
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error("找不到 content/tests 目录");
    process.exit(1);
  }
  const slugs = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (slugs.length === 0) {
    console.error("content/tests 下没有任何内容包");
    process.exit(1);
  }

  for (const slug of slugs) {
    validatePack(slug);
    const archiveRoot = path.join(ROOT, slug, "versions");
    if (!fs.existsSync(archiveRoot)) continue;
    for (const entry of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      validatePack(`${slug}@${entry.name}`, path.join(archiveRoot, entry.name), slug, entry.name);
    }
  }

  console.log(`\n内容包校验完成：${errors} 个错误，${warnings} 个提醒`);
  if (errors > 0) process.exit(1);
}

main();
