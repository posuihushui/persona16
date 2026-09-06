---
description: 走完整 agent 流水线新增一款测试,从选题到可联调的内容包
argument-hint: <slug> <一句话描述这款测试>
---

新增一款测试:$ARGUMENTS

先读 `agents.md` 和 `docs/product/test-pack-spec.md`,然后严格按顺序执行。每一步产出必须先通过检查再进入下一步,不要并行跳步。

**第 1 步 — product-owner**
调用 `product-owner` 输出 `docs/product/prd-<slug>.md`。必须包含:目标用户与场景、一句话价值主张、题目数量与预计时长、免费/付费边界表、传播机制、指标合格线、不做什么。
把免费/付费边界表贴给我确认后再继续。

**第 2 步 — test-designer**
调用 `test-designer`,按 PRD 产出 `content/tests/<slug>/meta.json`、`questions.json`、`scoring.json`。
要求它跑完自查清单并汇报六项结果,然后运行 `npm run check:content`。

**第 3 步 — content-writer**
调用 `content-writer`,按 `scoring.json` 声明的类型码逐个产出 `content/tests/<slug>/results/<CODE>.json`。
要求它做可替换性自查:随机抽三对类型互换核心描述,如果互换后都读得通就重写。

**第 4 步 — compliance-reviewer**
调用 `compliance-reviewer` 审查本次新增的全部内容包和文案。
阻断项必须回到对应 agent 修完再复审。合规未签字不要进入第 5 步。

**第 5 步 — 联调**
运行 `npm run check:content && npm run check:compliance && npm run typecheck && npm run build`。
全绿后把新测试加入首页测试列表,并更新 CHANGELOG.md。

**第 6 步 — growth-operator**
调用 `growth-operator` 为这款测试产出分享话术、封面文案方向和一条冷启动路径,写入 `docs/operations/launch-<slug>.md`。
