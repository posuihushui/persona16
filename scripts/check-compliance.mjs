#!/usr/bin/env node
/**
 * 面向用户文案的机器合规检查。
 *
 * 这是辅助，不是替代。人工审查见 .claude/agents/compliance-reviewer.md，
 * 脚本通过不等于合规通过。
 *
 * 豁免只用于确实需要引用规则原文的场合，比如运营文档里列出禁用词清单：
 *   行级   在该行任意位置写 compliance-allow
 *   区块级 用 compliance-allow:start 和 compliance-allow:end 包住若干行
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** 扫描面向用户的内容，不扫描规则文档和脚本自身。 */
const TARGETS = ["content", "src", "docs/operations", "public"];
const EXTENSIONS = new Set([".json", ".ts", ".tsx", ".md", ".mdx", ".html"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

const RULES = [
  {
    group: "商标与版权",
    severity: "block",
    patterns: [
      { re: /MBTI/i, why: "MBTI 是 The Myers-Briggs Company 的注册商标，本站不得使用" },
      { re: /Myers[\s-]?Briggs/i, why: "不得使用 Myers-Briggs 商标" },
      { re: /迈尔斯[\s·-]?布里格斯/, why: "不得使用 Myers-Briggs 的中文译名" },
      { re: /16Personalities/i, why: "不得引用第三方产品品牌" },
      /*
       * 第三方产品对 16 个类型的命名，中英文都不能沿用。
       *
       * 这些词单独出现时大多是普通词（Executive、建筑师、探险家），
       * 直接整词阻断会在架构文档和插画描述里大面积误报。
       * 所以只在它紧挨着类型码或「人格 / Personality」时才判定为沿用命名——
       * 「MEDIATOR + PERSONALITY」「INFP Mediator」「调停者人格」都会被拦下。
       */
      {
        re: /\b(?:Architect|Logician|Commander|Debater|Advocate|Mediator|Protagonist|Campaigner|Logistician|Defender|Executive|Consul|Virtuoso|Adventurer|Entrepreneur|Entertainer)\b[\s·:：|,，、（(-]*\(?\s*[EI][SN][TF][JP]\b/i,
        why: "这是第三方产品的英文类型命名，不得沿用",
      },
      {
        re: /\b[EI][SN][TF][JP]\b[\s·:：|,，、）)-]*\(?\s*(?:Architect|Logician|Commander|Debater|Advocate|Mediator|Protagonist|Campaigner|Logistician|Defender|Executive|Consul|Virtuoso|Adventurer|Entrepreneur|Entertainer)\b/i,
        why: "这是第三方产品的英文类型命名，不得沿用",
      },
      {
        re: /\b(?:Architect|Logician|Commander|Debater|Advocate|Mediator|Protagonist|Campaigner|Logistician|Defender|Executive|Consul|Virtuoso|Adventurer|Entrepreneur|Entertainer)\b\s*[+＋]?\s*Personality\b/i,
        why: "这是第三方产品的英文类型命名，不得沿用",
      },
      {
        re: /(?:建筑师|逻辑学家|指挥官|辩论家|提倡者|调停者|主人公|竞选者|物流师|守卫者|总经理|执政官|鉴赏家|探险家|企业家|表演者)\s*(?:人格|型人格)/,
        why: "这是第三方产品的中文类型命名，不得沿用",
      },
      {
        re: /(?:建筑师|逻辑学家|指挥官|辩论家|提倡者|调停者|主人公|竞选者|物流师|守卫者|总经理|执政官|鉴赏家|探险家|企业家|表演者)\s*[（(]?\s*[EI][SN][TF][JP]\b/,
        why: "这是第三方产品的中文类型命名，不得沿用",
      },
    ],
  },
  {
    group: "广告法绝对化用语",
    severity: "block",
    patterns: [
      { re: /最(准|专业|权威|科学|好的?测试|受欢迎)/, why: "绝对化用语，违反广告法" },
      { re: /(全网|全国|世界)第一/, why: "绝对化用语，违反广告法" },
      { re: /国家级|世界级|顶级品质/, why: "绝对化用语，违反广告法" },
      { re: /100\s*%\s*(准确|精准|有效)/, why: "无法证实的效果承诺" },
      { re: /唯一(一家|的选择)/, why: "绝对化用语，违反广告法" },
      { re: /(权威|官方)认证/, why: "无资质佐证的认证声明" },
    ],
  },
  {
    group: "心理表达边界",
    severity: "block",
    patterns: [
      { re: /(可以|能够|帮你)(诊断|治疗|治愈)/, why: "本站不是医疗服务，不得暗示诊断或治疗" },
      { re: /疗效/, why: "不得出现疗效表述" },
      { re: /抑郁症|焦虑症|强迫症|双相|精神分裂/, why: "不得出现疾病名称" },
      { re: /你注定/, why: "宿命论表达，违反产品原则 3" },
      { re: /你永远(不会|不能|无法)/, why: "宿命论表达，违反产品原则 3" },
      { re: /(性格|人格)(不可|无法)改变/, why: "宿命论表达，违反产品原则 3" },
      { re: /智商(高|低)|情商(高|低)/, why: "类型不是能力评价，不得关联智商情商" },
    ],
  },
  {
    group: "平台规则",
    severity: "block",
    patterns: [
      { re: /分享.{0,6}(才能|即可|后).{0,4}(解锁|查看|获得)/, why: "诱导分享，违反微信规则和产品原则 1" },
      { re: /集赞|求赞|助力解锁/, why: "诱导分享" },
      { re: /转发(到|给).{0,8}(群|好友).{0,6}(解锁|查看)/, why: "诱导分享" },
      { re: /关注.{0,6}(才能|后才).{0,4}(查看|解锁)/, why: "诱导关注作为功能前置条件" },
    ],
  },
  {
    group: "个人信息",
    severity: "block",
    patterns: [
      { re: /(请|需要)(填写|输入|提供).{0,6}(身份证|手机号|真实姓名|住址)/, why: "不得收集敏感个人信息" },
    ],
  },
  {
    group: "建议优化",
    severity: "advisory",
    patterns: [
      { re: /不测.{0,6}(就会|你就)/, why: "疑似恐惧营销" },
      { re: /(免费|限时).{0,4}(仅剩|最后).{0,4}(名额|机会)/, why: "疑似制造虚假稀缺" },
    ],
  },
  {
    // 分享换折扣是产品有意为之的裂变机制，不阻断，但必须每次检查都看得见。
    // 它不锁内容（那是阻断项），但在微信规则里仍属于利益诱导分享。
    group: "利益诱导分享",
    severity: "advisory",
    patterns: [
      {
        re: /分享.{0,10}(折|优惠|立减|减\s*\d|返现)|(折|优惠).{0,10}分享/,
        why: "以优惠换分享属于微信规则里的利益诱导分享。当前只影响价格不锁内容，风险低于分享解锁，但仍可能被举报限制。要完全规避，把 paywall.json 的 discount.trigger 改成 timed，变成纯限时促销",
      },
    ],
  },
];

let blocking = 0;
let advisory = 0;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function checkFile(file) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, "utf8").split("\n");

  let inAllowedBlock = false;

  lines.forEach((line, i) => {
    if (line.includes("compliance-allow:start")) {
      inAllowedBlock = true;
      return;
    }
    if (line.includes("compliance-allow:end")) {
      inAllowedBlock = false;
      return;
    }
    if (inAllowedBlock || line.includes("compliance-allow")) return;

    for (const rule of RULES) {
      for (const pattern of rule.patterns) {
        if (!pattern.re.test(line)) continue;
        const marker = rule.severity === "block" ? "✗ 阻断" : "! 建议";
        if (rule.severity === "block") blocking++;
        else advisory++;
        console.log(
          `${marker} [${rule.group}] ${rel}:${i + 1}\n        ${pattern.why}\n        ${line.trim().slice(0, 120)}`,
        );
      }
    }
  });
}

function checkPaywallPromises() {
  const testsRoot = path.join(ROOT, "content", "tests");
  if (!fs.existsSync(testsRoot)) return;

  for (const slug of fs.readdirSync(testsRoot)) {
    const paywallPath = path.join(testsRoot, slug, "paywall.json");
    if (!fs.existsSync(paywallPath)) continue;
    const paywall = JSON.parse(fs.readFileSync(paywallPath, "utf8"));

    // 付费承诺必须对应实际交付的字段，避免卖了没给
    const resultsDir = path.join(testsRoot, slug, "results");
    if (!fs.existsSync(resultsDir)) continue;
    const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith(".json"));
    if (files.length === 0) continue;

    const sample = JSON.parse(fs.readFileSync(path.join(resultsDir, files[0]), "utf8"));
    const missing = (paywall.paid ?? []).filter((key) => {
      const v = sample[key];
      return v === undefined || v === null || (Array.isArray(v) && v.length === 0);
    });
    if (missing.length > 0) {
      blocking++;
      console.log(
        `✗ 阻断 [付费承诺] content/tests/${slug}/paywall.json\n        承诺的付费字段在结果文件里缺失: ${missing.join(", ")}`,
      );
    }
    if ((paywall.promise ?? []).length > (paywall.paid ?? []).length + 2) {
      advisory++;
      console.log(
        `! 建议 [付费承诺] content/tests/${slug}/paywall.json\n        承诺条数明显多于实际付费字段，人工确认每条都有对应交付`,
      );
    }
  }
}

function main() {
  const files = TARGETS.flatMap((t) => walk(path.join(ROOT, t), []));
  console.log(`合规检查：扫描 ${files.length} 个文件\n`);
  for (const f of files) checkFile(f);
  checkPaywallPromises();

  console.log(`\n合规检查完成：${blocking} 个阻断项，${advisory} 个建议项`);
  if (blocking === 0 && advisory === 0) console.log("机器检查无发现。人工审查仍然是上线门槛。");
  if (blocking > 0) process.exit(1);
}

main();
