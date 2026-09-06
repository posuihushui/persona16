# 国内设备与浏览器适配

这个站的用户不在 Chrome 里。他们在微信的 X5 内核、MIUI 浏览器、华为浏览器、UC、QQ 浏览器和百度 App 的内置 WebView 里。这些环境有三个共同点：内核落后主线好几代、访问不到大部分境外资源、各家都有自己的脾气。

`npm run check:china` 是这份文档的机器执行版本，已经进了 `npm run ship`。

## 一、兼容基线

`.browserslistrc` 的底线是 **Chrome 70 / iOS 12 / Android 7**。构建期按它降级 JS 语法和 CSS 前缀。

这个数字不是拍脑袋定的：

| 环境 | 实际内核 | 说明 |
| --- | --- | --- |
| 微信 Android | X5 (TBS)，Chromium 66 到 107 不等 | 同一个微信版本在不同机型上内核可能不同 |
| 微信 iOS | WKWebView，等于系统 Safari | 跟随 iOS 版本，老机器停在 iOS 12 |
| MIUI 浏览器 | Chromium，通常较新 | 小米更新较勤 |
| 华为浏览器 | 自研内核，能力接近 Chrome 90+ | HarmonyOS 上表现稳定 |
| UC 浏览器 | U4 内核 | 有自己的排版和夜间模式干预 |
| QQ 浏览器 | X5，同微信 | |
| 抖音内置 | Chromium，较新 | 但无法唤起微信支付 |

抬高基线之前先问一句：省下的那点体积，值不值得放弃一批还在用老机器的用户。

## 二、为此付出的代价

**去掉了 Tailwind。** 项目一个工具类都没用到，只是在用它的 reset，但 Tailwind v4 会产出 `@property`、`color-mix()`、`@layer` 和 `oklab()`，这几样在 X5 上会让整块样式失效。自己写 reset 之后 CSS 产物从 10.3 KB 降到 6.9 KB，且没有一个特性超出基线。

**flex 的 gap 全部带回退。** `gap` 在 flex 容器里要 Chrome 84 / iOS 14.5，低于这个版本会把间距全部丢掉，元素挤成一团，这是最容易在真机上翻车的一条。做法是 `.row` 和 `.wrap` 两个类默认用 margin，外面套 `@supports (gap: 1px)` 再切回 gap。组件里不允许再写内联的 `display: flex` 加 `gap`，检查脚本会拦。

**逻辑属性全换成物理属性。** `padding-block`、`inset-block` 这类要 Chrome 87，而且构建期不会自动降级。

**加了一层极小的运行时补丁。** `src/components/LegacyPolyfills.tsx` 内联在 head 里，补 `Array.prototype.at`、`String.prototype.at`、`Object.hasOwn`、`replaceAll` 和 `Promise.allSettled`。其中 `.at()` 是必需的：Next.js 的客户端路由用它解析 redirect 的 digest，缺了会在跳转时抛错，而我们的答题提交和支付确认都依赖客户端跳转。

**深色模式做成可降级。** `prefers-color-scheme` 要 Chrome 76 / iOS 13，更老的内核读不到那段媒体查询，会停在浅色令牌上。所以浅色配色必须独立成立，不能依赖深色变量。

## 三、境外资源一律不用

国内访问不到或极不稳定的域名在 `check:china` 里有一张清单，命中即阻断。目前站上：

- 字体：只用系统字体栈，按苹方、鸿蒙、小米兰亭、思源、雅黑依次回落，不加载任何字体文件。
- 统计：自建埋点写数据库，不接 Google Analytics。
- 依赖：全部打进产物，不走任何公共 CDN。
- 图片：只有自己生成的 PNG 图标和动态 SVG 分享卡。

新增任何第三方 SDK 之前，先确认它的资源域名在国内可达。这条没有例外。

## 四、各家的具体脾气

写在 `layout.tsx` 的 meta 里，每一条都有明确目的：

| 声明 | 针对 | 作用 |
| --- | --- | --- |
| `Cache-Control: no-transform` | 运营商 | 拒绝中间人转码和注入广告 |
| `Cache-Control: no-siteapp` | 百度 | 拒绝百度移动转码重排页面 |
| `applicable-device: mobile` | 百度、神马 | 声明这是移动页，走移动索引 |
| `renderer: webkit` | 360、搜狗 | 双核浏览器强制走 webkit，别用 IE 内核渲染 |
| `x5-orientation: portrait` | 微信、QQ 浏览器 | 锁竖屏 |
| `browsermode: application` | UC | 关掉 UC 自己的页面适配 |
| `nightmode: disable` | UC | UC 的强制夜间模式会把我们自己的深色配色搅乱 |
| `viewport-fit: cover` | 全部刘海屏 | 内容铺满，边距交给 CSS 的 safe-area 变量 |

刘海屏、挖孔屏和底部手势条通过 `--safe-top` 等四个变量处理，不支持 `env()` 的内核回落到 0，不会出问题。

**iOS 输入框放大**：字号小于 16px 的输入框在聚焦时会强制放大整个页面，找回码输入框因此固定 16px。这是 `.field` 类存在的唯一理由。

## 五、添加到桌面

国产厂商浏览器都支持添加到桌面，这是把 H5 留在用户桌面上最现实的手段，比引导下载 App 便宜得多。

`src/app/manifest.ts` 提供名称、图标和 `display: standalone`。图标由 `npm run build:icons` 生成，是纯 Node 手写的 PNG 编码，不引入图形库。图案是四条长度不一的横条，对应产品里的四个维度倾向条，外圈留了 22% 安全边，Android 自适应图标裁切后仍然完整。

改了图标或品牌色之后要重新跑 `npm run build:icons`，生成的 PNG 进版本管理。

## 六、搜索引擎与站长平台

各家的抓取器都在 `robots.ts` 的放行名单里：Baiduspider、Sogou web spider、360Spider、YisouSpider（神马）、PetalBot（华为）。

站长平台验证码通过环境变量注入，未配置时不输出对应的 meta：

| 变量 | 平台 |
| --- | --- |
| `BAIDU_SITE_VERIFICATION` | 百度搜索资源平台 |
| `BYTEDANCE_SITE_VERIFICATION` | 头条搜索 |
| `SOGOU_SITE_VERIFICATION` | 搜狗 |
| `SHENMA_SITE_VERIFICATION` | 神马 |
| `QIHOO_SITE_VERIFICATION` | 360 |
| `HUAWEI_SITE_VERIFICATION` | 华为 Petal Search |

主动推送见 `npm run seo:ping`，详见 [seo.md](./seo.md)。

## 七、真机验证清单

模拟器测不出内核差异。上线前至少在这几台上真机走一遍完整流程，从落地页到支付到报告：

- [ ] 微信 Android，一台三年以上的老机器，重点看间距有没有挤成一团
- [ ] 微信 iOS，重点看输入框聚焦是否放大页面
- [ ] MIUI 浏览器，重点看深色模式和底部手势条遮挡
- [ ] 华为浏览器，重点看刘海区域和字体回落
- [ ] UC 浏览器，重点看夜间模式有没有把配色搅乱
- [ ] 抖音内置浏览器，重点看点解锁时是否给出明确引导而不是无反应
- [ ] 任意一台上试一次添加到桌面，看图标和名称对不对

每台都要看的三件事：首屏有没有横向滚动、结果卡截图好不好看、答题选完能不能自动进下一题。

## 八、暂时不做的事

**快应用。** 华为、小米、OPPO、vivo 联合的快应用联盟确实是一个真实的分发入口，能直接进负一屏和应用商店搜索。但它是另一套技术栈，需要单独开发和维护，且需要企业资质逐家入驻。等 H5 的分享率和付费率跑通、确认这门生意成立之后再评估。

**厂商小程序。** 华为元服务、小米直达服务同理。

**接入厂商推送。** H5 拿不到系统级推送能力，这条路要走必须先有 App 或快应用。

在那之前，添加到桌面加上私域承接已经能覆盖大部分留存需求。
