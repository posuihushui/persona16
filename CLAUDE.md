# CLAUDE.md

先读 `agents.md`。那里是产品原则和 agent 协作约定，本文件只讲工程约定。

## 最重要的一条

新增一款测试必须只写内容包和文案，不改引擎。任何需要动 `src/lib/scoring.ts` 才能上线的新测试，说明 `docs/product/test-pack-spec.md` 的 schema 设计不足，先改规范再改引擎。

不要在计分引擎或页面里写 `if (slug === "persona16")` 这类分支。

## 目录边界

改动前确认你在哪个边界里，跨边界的改动先说明再动：

| 目录 | 归属 |
| --- | --- |
| `content/tests/*/questions.json`、`scoring.json` | test-designer |
| `content/tests/*/results/` | content-writer |
| `docs/product/` | product-owner |
| `docs/design/`、`src/app/globals.css` | visual-designer |
| `src/app/`、`src/components/` | frontend-engineer |
| `src/lib/`、`prisma/`、`src/app/api/` | backend-engineer |
| `docs/operations/` | growth-operator |
| `docs/legal/` | compliance-reviewer |

## 代码约定

- 默认写 Server Component。只有需要状态、事件或浏览器 API 才加 `"use client"`。
- 面向用户的测试文案一律从内容包读。组件里只允许按钮、导航这类结构性 UI 文本。
- 颜色和字号只用 `globals.css` 的 CSS 变量，组件里不写死色值。
- 兼容基线是 Chrome 70 / iOS 12。横向排列用 `.row` 和 `.wrap` 类，不写内联的 `display:flex` 加 `gap`；用 `paddingTop`/`paddingBottom` 而不是 `paddingBlock`。
- 不引用任何境外域名。字体、统计、依赖全部本地化。
- 所有外部输入用 zod 校验后再进业务逻辑。
- `localStorage` 读写必须 try/catch，微信内置浏览器隐私模式会抛异常。
- 密钥只从环境变量读。任何以 `NEXT_PUBLIC_` 开头的变量都会进客户端 bundle。
- 付费内容不得出现在未付费用户的 HTML 里，鉴权在服务端做，不做隐藏式伪装。

## 数据库

Prisma 7 通过 driver adapter 连接，连接串不在 schema 里：

- 运行时连接在 `src/lib/db.ts`，用 `@prisma/adapter-mariadb`。
- CLI（migrate、studio）读 `prisma.config.ts`，它会自己加载 `.env.local` 和 `.env`。
- `prisma` 客户端是懒创建的，构建期不需要可连接的数据库。

## 提交前

按改动范围跑对应的检查，不要把失败的产物交出去：

```bash
npm run check:content      # 动过 content/
npm run check:compliance   # 动过任何面向用户的文案
npm run check:china        # 动过样式、依赖或第三方 SDK
npm run test               # 动过 src/lib/scoring.ts
npm run typecheck
npm run build
```

上线前跑 `npm run ship`，生产变量另外跑 `npm run check:prod-env -- --env-file <生产环境变量文件>`。

## 容易踩的坑

- **不要让 `next dev` 生成 AGENTS.md。** macOS 文件系统大小写不敏感，它会覆盖本仓库的 `agents.md`。`next.config.ts` 里的 `agentRules: false` 就是为了这个，不要删。
- **不要改已发布内容包的题目而不升版本号。** 历史作答按记录的版本渲染，改了不升版本会让老结果对不上。
- **不要用前端支付回调发放权益。** 权益只以服务端回调为准，前端回调只用于刷新界面。
- **不要在客户端算价。** 折扣力度、有效期、最终金额全部由服务端按 `paywall.json` 决定。客户端不发送价格也不发送折扣码，下单时服务端重新算一遍。
- **付费正文不能进任何公开出口。** 页面 HTML、meta、结构化数据、llms.txt、接口响应，一处都不行。加新的公开出口时先想清楚它会不会漏内容——类型页的 meta description 就这么漏过一次。
- **不要在结果页加分享解锁。** 这是产品原则 1，也会被微信判违规。
- **不要只依赖支付回调。** 微信回调会丢也会迟到，付了钱看不到报告是最伤信任的故障。改支付链路时保证主动查单那条路还在。
- **不要让用户的个人结果页变成可索引页面。** 它会稀释类型页权重，也会把个人数据交给搜索引擎。
- **不要在客户端注入结构化数据。** 抓取器不执行 JavaScript，JSON-LD 必须由 Server Component 渲染。
- **不要引入 CSS 框架。** Tailwind v4 产出的 `@property`、`color-mix`、`@layer`、`oklab` 在 X5 内核上会让整块样式失效。项目已经为此把它去掉了，别再加回来。
- **不要写内联的 flex gap。** `gap` 在 flex 里要 Chrome 84 / iOS 14.5，老内核会把间距全丢掉，元素挤成一团。用 `.row` 或 `.wrap`，它们带 `@supports` 回退。
- **运维脚本直接跑 TypeScript 时**要带 `--import ./scripts/register-ts.mjs`，否则源码里不带扩展名的相对导入解析不了。脚本结束前记得 `prisma.$disconnect()`，不然连接池会吊住进程。
