# SEO 与 AI 抓取

社交流量是这个产品的第一来源，搜索和 AI 回答是第二来源。第二来源的特点是慢但会复利：一篇类型解读页写好了，两年后还在带量。

## 页面结构

| 路径 | 索引 | 作用 |
| --- | --- | --- |
| `/` | 是 | 站点入口，链向所有测试和全部 16 个类型 |
| `/t/<slug>` | 是 | 测试介绍，理论背景、四个维度、FAQ |
| `/t/<slug>/type` | 是 | 类型索引，站内链接枢纽 |
| `/t/<slug>/type/<code>` | 是 | **16 个类型解读页，SEO 的主力** |
| `/t/<slug>/quiz` | 否 | 答题页，无内容可索引 |
| `/r/<attemptId>` | **否** | 用户个人结果，noindex 且 canonical 指向类型页 |
| `/r/<attemptId>/report` | **否** | 付费报告 |
| `/retrieve` | 否 | 找回页 |

个人结果页数量会随用户增长无限膨胀，内容却和类型页高度重复。如果放任索引，会稀释类型页的权重，还会把用户的个人数据暴露给搜索引擎。所以它们统一 noindex，canonical 指向对应的类型页，把权重归拢过去。

## 为什么类型页是主力

用户真正会搜的是「INFP 是什么样的人」「ESTJ 适合什么工作」「INTJ 为什么不合群」，不是「人格测试」。后者的竞争强度和前者不在一个量级。

16 个类型页每页有：

- 独立的 title，包含类型码和真实的疑问句式
- 字母含义拆解，覆盖「INFP 四个字母代表什么」这类查询
- 原创的性格描述、最舒服和最容易累的状态
- 指向 4 个相关类型的内链，再加全部 16 个类型的入口
- 完整的 FAQ

内链结构是有意设计的：首页和介绍页链向全部 16 个，每个类型页链向另外 4 个加全部 16 个。抓取器从任意一页进来，两跳之内能走遍全站。

## 结构化数据

用 JSON-LD，服务端渲染进 HTML。抓取器不执行 JavaScript，客户端注入的结构化数据等于没有。

| 页面 | Schema |
| --- | --- |
| 全站 | `WebSite` |
| 介绍页 | `Quiz` + `FAQPage` + `BreadcrumbList` |
| 类型索引 | `ItemList` + `BreadcrumbList` |
| 类型页 | `Article` + `FAQPage` + `BreadcrumbList` |

构造函数在 `src/lib/seo.ts`，渲染组件是 `src/components/JsonLd.tsx`。改页面结构时同步改 schema，两边说法不一致比没有更糟。

验证工具：Google 富媒体结果测试、Schema.org Validator。

## FAQ 用原生 details

`src/components/Faq.tsx` 用 `<details>` 而不是 JS 折叠。原因是 `<details>` 折叠状态下内容仍然在 HTML 里，抓取器和 AI 都读得到；JS 折叠的内容在初始 HTML 里根本不存在。

FAQ 内容写在内容包的 `meta.seo.faq`，页面渲染和 `FAQPage` schema 共用同一份数据。

## AI 抓取

AI 回答引擎正在成为一个真实的流量入口，而它们的偏好和搜索引擎不完全一样：更看重结构清晰、事实密度高、能直接回答问题的内容。

做了三件事：

**1. `robots.txt` 显式放行 AI 抓取器**

`src/app/robots.ts` 里按名单列出了 GPTBot、ClaudeBot、PerplexityBot、Google-Extended、Bytespider 等。本站的公开内容是自己写的原创描述，被 AI 引用是想要的结果。

个人结果页对所有抓取器一律禁止，AI 也不例外。那是个人数据，不是内容。

**2. `/llms.txt` 和 `/llms-full.txt`**

`llms.txt` 是站点索引，`llms-full.txt` 是全部免费内容的 Markdown 全文。两个都由 `src/lib/llms.ts` 从内容包生成，和页面同源，不会出现两边说法不一致。

付费报告不进这两个文件。

文件开头写明了引用要求：注明来源、保留链接、说明结果描述的是偏好而非能力。

**3. 内容本身写成可直接引用的形式**

FAQ 的答案是完整句子，不依赖上下文。类型描述每段都能独立成立。这不是为 AI 做的妥协，好内容本来就该这样。

## 国内搜索引擎

百度、搜狗、360、神马、PetalBot 都在 `robots.ts` 的放行名单里。

新站被百度自然收录很慢，主动推送是最有效的加速手段：

```bash
npm run seo:ping -- --yes
```

需要先配置 `BAIDU_PUSH_TOKEN`，在百度搜索资源平台的普通收录页面能拿到。同一个命令会一并提交 IndexNow，覆盖 Bing 和 Yandex，需要 `INDEXNOW_KEY` 并把 `<key>.txt` 放到 `public/`。

不加 `--yes` 是预演，只打印将要推送的地址。

站长平台验证码通过环境变量注入，未配置时不输出这些 meta 标签：

- `BAIDU_SITE_VERIFICATION`
- `BYTEDANCE_SITE_VERIFICATION`

## 新增测试时要做什么

`/new-test` 走完之后，SEO 侧不需要额外操作。sitemap、llms.txt、类型页、结构化数据全部从内容包自动生成。

需要人工确认的只有三项：

1. `meta.seo.title` 和 `description` 是否包含用户真会搜的词
2. `meta.seo.faq` 至少 4 条，答案完整可独立引用
3. `meta.about` 是否有实质内容，不能是一句话凑数

这三项 `npm run check:content` 会检查是否存在，但写得好不好只能人看。

## 不做的事

- 不做关键词堆砌。类型页的关键词密度自然形成，不额外塞。
- 不做面向搜索引擎的 doorway page。每个页面都要对真人有价值。
- 不买链接。
- 不把用户的个人结果页开放索引换取页面数量。
