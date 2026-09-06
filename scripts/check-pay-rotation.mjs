#!/usr/bin/env node
/**
 * 微信支付密钥轮换就绪检查。
 *
 *   npm run check:pay-rotation -- --env-file ./deploy/prod.env
 *
 * 微信的平台公钥和商户证书都会过期。轮换期新旧序列号必须同时可用，
 * 否则旧序列号签名的回调会验签失败，表现是用户付了钱但权益没发放。
 * 这个脚本在部署前检查配置形态，不打印任何密钥内容。
 *
 * 轮换流程见 docs/operations/wechat-pay-key-rotation.md。
 */
import crypto from "node:crypto";
import fs from "node:fs";

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

function main() {
  const file = parseArgs(process.argv);
  if (!file) {
    console.error("用法: npm run check:pay-rotation -- --env-file <环境变量文件>");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`找不到环境变量文件: ${file}`);
    process.exit(1);
  }

  const env = loadEnvFile(file);
  console.log(`微信支付密钥轮换检查: ${file}\n`);

  if (env.PAY_PROVIDER !== "wechat") {
    console.log(`PAY_PROVIDER=${env.PAY_PROVIDER ?? "未配置"}，未启用微信支付，跳过检查。`);
    return;
  }

  // 1. APIv3 密钥
  console.log("APIv3 密钥");
  const apiV3 = env.WECHAT_API_V3_KEY ?? "";
  if (!apiV3) fail("WECHAT_API_V3_KEY 未配置");
  else if (apiV3.length !== 32) fail(`WECHAT_API_V3_KEY 长度是 ${apiV3.length}，必须是 32 位`);
  else ok("WECHAT_API_V3_KEY 长度正确");

  // 2. 商户私钥与证书序列号
  console.log("\n商户私钥");
  const serial = env.WECHAT_MCH_SERIAL_NO ?? "";
  if (!/^[0-9A-F]{40}$/i.test(serial)) {
    fail(`WECHAT_MCH_SERIAL_NO 不像证书序列号，应为 40 位十六进制，当前 ${serial.length} 位`);
  } else {
    ok("WECHAT_MCH_SERIAL_NO 格式正确");
  }

  const pem = (env.WECHAT_MCH_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!pem) {
    fail("WECHAT_MCH_PRIVATE_KEY 未配置");
  } else if (!pem.includes("BEGIN PRIVATE KEY") && !pem.includes("BEGIN RSA PRIVATE KEY")) {
    fail("WECHAT_MCH_PRIVATE_KEY 不是 PEM 格式，检查换行是否用 \\n 转义");
  } else {
    try {
      const key = crypto.createPrivateKey(pem);
      const sig = crypto.createSign("RSA-SHA256").update("persona16").sign(key, "base64");
      if (!sig) throw new Error("签名为空");
      ok("商户私钥可用，试签成功");
    } catch (e) {
      fail(`商户私钥无法用于签名: ${e.message}`);
    }
  }

  // 3. 平台公钥映射，轮换期的核心
  console.log("\n平台公钥");
  const raw = env.WECHAT_PLATFORM_PUBLIC_KEYS ?? "";
  const entries = raw
    .split(";;")
    .map((pair) => {
      const i = pair.indexOf("=");
      if (i <= 0) return null;
      return { serial: pair.slice(0, i).trim(), pem: pair.slice(i + 1).trim().replace(/\\n/g, "\n") };
    })
    .filter(Boolean);

  if (entries.length === 0) {
    fail("WECHAT_PLATFORM_PUBLIC_KEYS 没有解析出任何 serial=PEM 映射");
  } else {
    for (const entry of entries) {
      if (!entry.serial) {
        fail("存在没有序列号的平台公钥条目");
        continue;
      }
      try {
        crypto.createPublicKey(entry.pem);
        ok(`平台公钥 ${entry.serial} 可解析`);
      } catch (e) {
        fail(`平台公钥 ${entry.serial} 无法解析: ${e.message}`);
      }
    }

    const serials = entries.map((e) => e.serial);
    if (new Set(serials).size !== serials.length) {
      fail("平台公钥存在重复的序列号");
    }
    if (entries.length === 1) {
      warn(
        "只配置了一个平台公钥序列号。这在稳定期没问题，但轮换开始后必须同时保留新旧两个，" +
          "否则用旧序列号签名的回调会验签失败",
      );
    } else {
      ok(`已配置 ${entries.length} 个序列号，具备轮换能力`);
    }
  }

  // 4. 回调地址
  console.log("\n回调地址");
  const notify = env.WECHAT_PAY_NOTIFY_URL ?? "";
  if (!notify) {
    fail("WECHAT_PAY_NOTIFY_URL 未配置");
  } else if (!notify.startsWith("https://")) {
    fail("WECHAT_PAY_NOTIFY_URL 必须是 https，微信不接受 http 回调地址");
  } else if (/localhost|127\.0\.0\.1/.test(notify)) {
    fail("WECHAT_PAY_NOTIFY_URL 指向本地地址，微信服务器访问不到");
  } else {
    ok("回调地址是可公网访问的 https 地址");
  }

  console.log(`\n轮换检查完成：${errors} 个问题，${warnings} 个提醒`);
  if (errors > 0) process.exit(1);
}

main();
