# Persona16

面向微信和抖音用户的自我认知测试站。第一款产品是「16 型人格测试」。

新增一款测试应当只写内容包和文案，不改引擎。这是整个项目的核心设计约束。

## 先读哪些文件

| 你要做什么 | 先读 |
| --- | --- |
| 了解产品判断和协作约定 | `agents.md` |
| 新增一款测试 | `docs/product/test-pack-spec.md`，然后跑 `/new-test` |
| 改页面或组件 | `docs/design/design-system.md` |
| 做运营和投放 | `docs/operations/wechat-distribution.md` |
| 接入微信支付 | `docs/operations/wechat-pay.md` |
| 处理密钥过期或轮换 | `docs/operations/wechat-pay-key-rotation.md` |
| 做 SEO 或 AI 抓取 | `docs/operations/seo.md` |
| 处理国产机型或浏览器兼容 | `docs/operations/china-devices.md` |
| 写任何面向用户的文案 | `docs/legal/compliance.md` |

## 技术栈

Next.js 16（App Router）· React 19 · TypeScript · Prisma 7 + MySQL

页面用 Server Component 渲染，交互用 Client Component，API 走 Route Handler。部署产物是 standalone，容器化上线到国内服务器。

**样式层不用 CSS 框架。** 用户在微信 X5、MIUI、华为、UC 这些落后主线好几代的内核里打开，兼容基线是 Chrome 70 / iOS 12，主流框架的产物会超出这个水位。CSS 全部手写，产物 6.9 KB。

## 本地起步

```bash
pnpm install
cp .env.example .env
# 填好 DATABASE_URL 和 SESSION_SECRET，PAY_PROVIDER 保持 mock
npx prisma migrate dev
npm run dev
```

`PAY_PROVIDER=mock` 时支付不扣款，点解锁会直接跳到一个确认地址标记为已支付。生产环境使用 mock 会被 `check:prod-env` 拦截。

## 目录

```
agents.md                 产品原则与 agent 协作约定
.claude/agents/           八个角色 agent 定义
.claude/commands/         /new-test /content-review /ship-check
content/tests/<slug>/     内容包，一款测试一个目录
docs/product/             PRD 与内容包规范
docs/design/              设计系统与分享卡
docs/operations/          分发、防封、冷启动
docs/legal/               合规红线
prisma/                   数据模型与迁移
scripts/                  校验脚本与计分引擎测试
src/lib/                  计分引擎、内容加载、支付、鉴权
src/app/                  页面与接口
```

## 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run check:content` | 内容包校验，提交门槛 |
| `npm run check:compliance` | 面向用户文案的机器合规检查 |
| `npm run check:prod-env -- --env-file <文件>` | 生产环境变量预检 |
| `npm run check:pay-rotation -- --env-file <文件>` | 微信支付密钥轮换就绪检查，会用商户私钥试签 |
| `npm run check:china` | 国内环境体检：境外资源、高版本特性、厂商适配必备项 |
| `npm run build:icons` | 重新生成 PWA 与添加到桌面用的 PNG 图标 |
| `npm run test` | 计分引擎测试 |
| `npm run ship` | 上线前全套检查 |
| `npm run refund -- --order <订单号> --reason <理由>` | 人工退款，不加 `--yes` 只做预演 |
| `npm run seo:ping` | 向百度和 IndexNow 主动推送 URL，不加 `--yes` 只做预演 |

## Agent 工作流

八个角色定义在 `.claude/agents/`，各自有明确的目录边界：

`product-owner` 产品 · `test-designer` 量表 · `content-writer` 文案 · `visual-designer` 设计 · `frontend-engineer` 前端 · `backend-engineer` 后端 · `growth-operator` 运营 · `compliance-reviewer` 合规

`compliance-reviewer` 对任何面向用户的内容有一票否决权。

新增一款测试走 `/new-test <slug> <一句话描述>`，流水线顺序是 product-owner → test-designer → content-writer → compliance-reviewer，四步都通过才进入前端联调。

## 几条不能绕过的约束

1. 免费结果对任何持链接的人可见，不做分享解锁。
2. 付费卖深度。类型码和四条轴的位置永远免费，性格描述给开头一段。
3. 全站不出现 MBTI 商标，题目全部自建。
4. 内容包发布后冻结，历史结果按当时版本渲染。
5. 权益只能由服务端发放。回调必须验签且幂等，回调没到时靠主动查单补状态，前端回调不作为依据。
6. 付费后换设备必须能凭找回码找回报告。
7. 类型解读页可索引，用户个人结果页一律 noindex 且 canonical 指向类型页。
8. 兼容基线是 Chrome 70 / iOS 12，不引用任何境外资源。
9. 价格只在服务端算，客户端不参与定价。分享换折扣，但分享不解锁任何内容。
