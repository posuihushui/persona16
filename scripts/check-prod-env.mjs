#!/usr/bin/env node
/**
 * 生产环境变量预检。
 *
 *   npm run check:prod-env -- --env-file ./deploy/prod.env
 *
 * 不读 .env，避免把本地开发配置误判成生产配置。
 * 只检查配置形态，绝不打印密钥值。
 */
import fs from "node:fs";

const PLACEHOLDER = /(replace[-_ ]?me|change[-_ ]?me|your[-_ ]?|xxx+|todo|占位|待填)/i;

function parseArgs(argv) {
  const idx = argv.indexOf("--env-file");
  if (idx === -1 || !argv[idx + 1]) return null;
  return argv[idx + 1];
}

function loadEnvFile(file) {
  const env = {};
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, eq).trim()] = value;
  }
  return env;
}

let errors = 0;
const fail = (msg) => {
  errors++;
  console.error(`  ✗ ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

function required(env, keys) {
  for (const key of keys) {
    const v = env[key];
    if (!v) {
      fail(`${key} 未配置`);
    } else if (PLACEHOLDER.test(v)) {
      fail(`${key} 仍然是占位值`);
    } else {
      ok(`${key} 已配置`);
    }
  }
}

function main() {
  const file = parseArgs(process.argv);
  if (!file) {
    console.error("用法: npm run check:prod-env -- --env-file <生产环境变量文件>");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`找不到环境变量文件: ${file}`);
    process.exit(1);
  }

  const env = loadEnvFile(file);
  console.log(`生产环境预检: ${file}\n`);

  console.log("基础配置");
  required(env, ["NEXT_PUBLIC_SITE_URL", "DATABASE_URL", "SESSION_SECRET"]);

  const site = env.NEXT_PUBLIC_SITE_URL ?? "";
  if (site && !site.startsWith("https://")) {
    fail("NEXT_PUBLIC_SITE_URL 生产必须是 https");
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|\.local\b/.test(site)) {
    fail("NEXT_PUBLIC_SITE_URL 指向本地地址");
  }
  if ((env.SESSION_SECRET ?? "").length < 32) {
    fail("SESSION_SECRET 长度不足 32，生产必须使用高强度随机值");
  }

  console.log("\n支付配置");
  const provider = env.PAY_PROVIDER;
  if (provider !== "wechat") {
    fail(`PAY_PROVIDER=${provider ?? "未配置"}，生产必须是 wechat，不允许 mock`);
  } else {
    ok("PAY_PROVIDER=wechat");
    required(env, [
      "WECHAT_APP_ID",
      "WECHAT_APP_SECRET",
      "WECHAT_MCH_ID",
      "WECHAT_API_V3_KEY",
      "WECHAT_MCH_SERIAL_NO",
      "WECHAT_MCH_PRIVATE_KEY",
      "WECHAT_PLATFORM_PUBLIC_KEYS",
      "WECHAT_PAY_NOTIFY_URL",
    ]);

    // 平台公钥必须按 Wechatpay-Serial 映射，轮换期要能同时保留新旧序列号
    const keys = env.WECHAT_PLATFORM_PUBLIC_KEYS ?? "";
    const serials = keys
      .split(";;")
      .map((p) => p.split("=")[0]?.trim())
      .filter(Boolean);
    if (serials.length === 0) {
      fail("WECHAT_PLATFORM_PUBLIC_KEYS 没有解析出任何 serial=PEM 映射");
    } else {
      ok(`平台公钥已配置 ${serials.length} 个序列号`);
    }

    const notify = env.WECHAT_PAY_NOTIFY_URL ?? "";
    if (notify && !notify.startsWith("https://")) {
      fail("WECHAT_PAY_NOTIFY_URL 必须是 https");
    }
  }

  console.log("\n法务与客服");
  required(env, ["LEGAL_ENTITY_NAME", "LEGAL_ICP_NUMBER", "LEGAL_CONTACT_EMAIL"]);
  const email = env.LEGAL_CONTACT_EMAIL ?? "";
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail("LEGAL_CONTACT_EMAIL 不是有效邮箱");
  }
  const icp = env.LEGAL_ICP_NUMBER ?? "";
  if (icp && !/备\d*号/.test(icp)) {
    fail("LEGAL_ICP_NUMBER 看起来不是有效的备案号");
  }

  console.log("\n泄漏检查");
  for (const key of Object.keys(env)) {
    if (key.startsWith("NEXT_PUBLIC_") && /SECRET|KEY|PRIVATE|TOKEN|PASSWORD/i.test(key)) {
      fail(`${key} 以 NEXT_PUBLIC_ 开头会被打进客户端 bundle，密钥不允许这样配置`);
    }
  }
  if (errors === 0) ok("没有发现会进入客户端的密钥");

  console.log(`\n预检完成：${errors} 个问题`);
  if (errors > 0) process.exit(1);
}

main();
