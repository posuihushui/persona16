import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

// 在独立进程的临时内容根目录验证换版，不修改已发布的真实内容包。
const root = process.cwd();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "persona16-version-"));
const fixture = path.join(dir, "content/tests/persona16");
fs.cpSync(path.join(root, "content/tests/persona16"), fixture, { recursive: true });
const archive = path.join(fixture, "versions/1.0.0");
fs.mkdirSync(archive, { recursive: true });
for (const item of ["meta.json", "questions.json", "scoring.json", "paywall.json", "results"]) {
  fs.cpSync(path.join(fixture, item), path.join(archive, item), { recursive: true });
}
for (const name of ["meta", "questions", "scoring"]) {
  const file = path.join(fixture, `${name}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.version = "2.0.0";
  fs.writeFileSync(file, JSON.stringify(data));
}
process.chdir(dir);
const { loadPack, freeView } = await import("../src/lib/content.ts");
process.chdir(root);
process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));

test("当前版本和历史版本分别加载，缺失版本不回退", () => {
  assert.equal(loadPack("persona16").meta.version, "2.0.0");
  assert.equal(loadPack("persona16", "1.0.0").meta.version, "1.0.0");
  assert.throws(() => loadPack("persona16", "9.0.0"));
});
test("内容包地址拒绝路径穿越", () => {
  for (const slug of ["../persona16", "persona16/versions/1.0.0", "..", ""]) assert.throws(() => loadPack(slug));
  assert.throws(() => loadPack("persona16", "../1.0.0"));
});
test("全部类型免费出口仅有配置允许字段和短预览", () => {
  const pack = loadPack("persona16", "1.0.0");
  for (const doc of Object.values(pack.results)) {
    const view = freeView(doc, pack.paywall);
    assert.ok(view.teaser && doc.core.startsWith(view.teaser));
    assert.ok(view.teaser!.length < doc.core.length);
    for (const field of pack.paywall.paid) assert.equal((view as Record<string, unknown>)[field], undefined);
  }
});

test("内容校验同时检查归档，并拒绝与归档目录不一致的版本号", () => {
  const check = () => spawnSync(process.execPath, [path.join(root, "scripts/validate-content.mjs")], { cwd: dir, encoding: "utf8" });
  const valid = check();
  assert.equal(valid.status, 0, valid.stderr);
  assert.ok(valid.stdout.includes("persona16@1.0.0"));
  const file = path.join(archive, "meta.json");
  const original = fs.readFileSync(file, "utf8");
  try {
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(original), version: "8.0.0" }));
    const invalid = check();
    assert.equal(invalid.status, 1);
    assert.ok(invalid.stderr.includes("归档版本还须与目录名一致"));
  } finally {
    fs.writeFileSync(file, original);
  }
});
