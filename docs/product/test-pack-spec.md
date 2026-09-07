# 内容包规范 Test Pack Spec

一款测试就是一个内容包。上线一款新测试应当只新增内容包和文案,不修改 `src/lib/scoring.ts`。需要改引擎才能上线的测试,说明本规范设计不足,先改规范再改引擎。

## 目录结构

```
content/tests/<slug>/
├── meta.json        测试的身份、SEO、外观
├── questions.json   题目与作答量表
├── scoring.json     维度、计分与结果映射
├── paywall.json     免费/付费边界
└── results/
    └── <CODE>.json  每个结果类型一个文件
```

## 版本与冻结

`meta.json`、`questions.json`、`scoring.json` 三个文件共用同一个 `version`。

内容包一经发布即冻结。修订题目、权重或结果映射必须升 minor 版本,只改文案错别字升 patch 版本。每次作答会记录当时的 `version`,历史结果永远按记录的版本渲染,不随最新内容包变化。这保证用户三个月后回来看到的报告和当初截图的一致。

当前版本仍在测试根目录。发布新版本前，将旧版的四个 JSON 和 `results/` 完整复制到 `versions/<旧版本号>/`，不要把 `versions/` 自身复制进去。归档和新版本必须一起部署，旧归档不得删除或修改。`check:content` 同时检查当前目录与所有归档。

`loadPack(slug, version)` 按精确版本读取，缺少归档或版本不匹配时失败，不静默使用新版。个人结果、报告、报价及卡片使用 `Attempt.packVersion`；公开类型页使用当前版本。提交必须携带页面的 `packVersion`，题库已更新时返回 409，避免用新版规则解释旧版答案。

跨测试共用的进度、分享和支付提示集中在 `content/ui.json`，不属于已冻结的测评正文；修改这些提示不改变题库版本。

## meta.json

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `slug` | string | 与目录名一致,进 URL |
| `version` | string | 语义化版本 |
| `name` | string | 展示名 |
| `tagline` | string | 一句话卖点,进分享卡 |
| `description` | string | 介绍页正文 |
| `questionCount` | number | 必须等于 questions 数组长度 |
| `estimatedMinutes` | number | 预计时长 |
| `theme.accent` | string | 主色,CSS 颜色值 |
| `seo.title` / `seo.description` | string | 页面 SEO |
| `disclaimer` | string | 免责声明,结果页必须展示 |
| `status` | `draft` \| `published` | draft 不进首页列表 |

## questions.json

作答量表定义在 `scale`,题目在 `questions`。

```json
{
  "scale": {
    "id": "agree5",
    "options": [
      { "value": 2, "label": "很符合" },
      { "value": 1, "label": "有点符合" },
      { "value": 0, "label": "说不好" },
      { "value": -1, "label": "不太符合" },
      { "value": -2, "label": "很不符合" }
    ]
  },
  "questions": [
    { "id": "q01", "text": "……", "dimension": "EI", "pole": "E", "weight": 1 }
  ]
}
```

`pole` 表示「同意这道题」把分数推向该维度的哪一极。反向计分不需要额外字段:一道计向 I 极的题,用户答「很符合」就给 I 加分。这样正反向平衡就等于两极题目数平衡,校验脚本可以直接检查。

## scoring.json

```json
{
  "mode": "dichotomy",
  "dimensions": [
    {
      "id": "EI",
      "name": "精力方向",
      "positivePole": "E",
      "tieBreak": "I",
      "poles": {
        "E": { "name": "外向", "summary": "……" },
        "I": { "name": "内向", "summary": "……" }
      }
    }
  ],
  "codeOrder": ["EI", "SN", "TF", "JP"]
}
```

### 计分算法

对每个维度:

1. `raw = Σ answerValue × weight × (question.pole === positivePole ? 1 : -1)`
2. `max = Σ |maxScaleValue| × weight`,即该维度理论最大绝对值
3. `percent = (raw + max) / (2 × max) × 100`,取值 0 到 100,越大越偏向 `positivePole`

`percent` 是展示用的维度倾向强度。50 表示两极完全均衡。

### 三种结果模式

**`dichotomy`** — 每个维度取一极,按 `codeOrder` 拼成类型码。`percent > 50` 取 `positivePole`,`< 50` 取另一极,`= 50` 取 `tieBreak`。16 型人格用这个模式。

**`bands`** — 把某个分数映射到命名区间。适合焦虑、压力、拖延这类单一强度量表。

```json
{
  "mode": "bands",
  "bandSource": "total",
  "bands": [
    { "id": "low", "maxPercent": 33, "name": "较低" },
    { "id": "mid", "maxPercent": 66, "name": "中等" },
    { "id": "high", "maxPercent": 100, "name": "较高" }
  ]
}
```

`bandSource` 取 `total`(全部维度平均)或 `dimension:<id>`。结果码就是命中的 band `id`。

**`profile`** — 不产生离散类型,结果码固定为 `PROFILE`,报告按维度百分比渲染。适合大五人格这类连续维度量表。

## paywall.json

```json
{
  "free": ["name", "label", "keywords"],
  "teaser": { "field": "core", "chars": 62 },
  "paid": ["core", "atBest", "atWorst", "cognition", "..."],
  "price": { "amount": 990, "currency": "CNY", "originalAmount": 1990 },
  "discount": { "percent": 60, "windowHours": 24, "trigger": "share" },
  "productName": "……深度报告",
  "locked": [{ "key": "core", "title": "完整的性格描述", "hint": "……" }],
  "promise": ["……"],
  "refundNote": "……"
}
```

| 字段 | 说明 |
| --- | --- |
| `free` | 无条件可见的字段 |
| `teaser` | 从某个付费字段截出开头若干字做预览。`field` 必须是付费字段 |
| `paid` | 付费字段，与 `free` 不得重叠 |
| `price.amount` | 单位分 |
| `discount.percent` | 折后按原价的百分之多少收，60 即六折 |
| `discount.windowHours` | 券的有效期小时数 |
| `discount.trigger` | `share` 用户主动分享后领取，`timed` 首次看到结果就自动发放 |
| `locked` | 付费墙上的锁定清单。只给标题和一句钩子，`key` 必须是付费字段 |
| `promise` | 付费承诺，合规审查会核对它与实际交付是否一致 |

**预览长度有上限。** 校验脚本会按最短的那篇正文计算，预览不得超过它的六成，否则等于把付费内容公开。这条是硬拦截，不是提醒。

**价格只在服务端算。** 客户端既不发送价格也不发送折扣码。展示和下单走同一个 `quote()`，下单时重新算一遍，不复用展示过的报价。

**分享不解锁内容。** `trigger: "share"` 换到的只是价格，免费部分在分享前后完全一样。要完全规避微信的利益诱导分享风险，把它改成 `timed`，前端会自动隐藏分享入口，服务端改为首次看到结果时自动发券，不用改代码。

## results/<CODE>.json

结果文件的键必须覆盖 `paywall.json` 中 `free` 与 `paid` 的并集。

| 键 | 类型 | 层级 | 说明 |
| --- | --- | --- | --- |
| `code` | string | — | 类型码,与文件名一致 |
| `name` | string | 免费 | 类型名 |
| `label` | string | 免费 | 一句人设标签,进分享卡 |
| `keywords` | string[] | 免费 | 三个关键词 |
| `core` | string | 付费，免费仅给预览 | 核心性格描述 |
| `atBest` | string | 付费 | 最舒服的状态 |
| `atWorst` | string | 付费 | 最容易累的状态 |
| `cognition` | string | 付费 | 认知偏好拆解 |
| `strengths` | string[] | 付费 | 五条优势 |
| `blindSpots` | `{point, action}[]` | 付费 | 五条盲点,每条配一个具体改善动作 |
| `career` | `{fits[], drains[], roles[]}` | 付费 | 职业环境匹配与不匹配 |
| `relationship` | `{inLove, friction}` | 付费 | 亲密关系表现与常见摩擦 |
| `withOthers` | `{code, note}[]` | 付费 | 与其他类型的相处提示 |
| `growth` | string[] | 付费 | 三条成长建议 |

`dimensions` 不写在结果文件里,它由计分引擎按用户实际得分生成。

## 校验

`npm run check:content` 检查:

- 三个主文件版本号一致
- `questionCount` 与题目数一致,题目 id 唯一
- 每个维度题目数相等,两极题目数平衡在 4:6 到 6:4 之间
- 题目引用的 `dimension` 和 `pole` 在 `scoring.json` 中存在
- 题干长度不超过 30 字
- `dichotomy` 模式下所有类型码组合都有对应结果文件
- 结果文件覆盖 `paywall.json` 声明的全部键,且 `free` 与 `paid` 不重叠
- `withOthers` 引用的类型码存在

校验不通过不允许提交。
