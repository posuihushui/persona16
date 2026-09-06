import type { Metadata, Viewport } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegacyPolyfills } from "@/components/LegacyPolyfills";
import { SITE_NAME, siteUrl, websiteSchema } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  // 让所有相对的 canonical 和 OG 图地址自动补全成绝对地址
  metadataBase: new URL(siteUrl()),
  title: {
    default: "16型人格测试 - 免费48题，含维度倾向与性格报告",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "免费 16 型人格测试，48 道情境题，8 分钟出结果。给出类型码、四维度倾向强度和完整性格描述，不需要注册也不需要分享。",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE_NAME,
    url: siteUrl(),
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "16型人格",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, email: false, address: false },
  other: {
    // ---- 百度与神马的移动适配声明 ----
    "applicable-device": "mobile",
    MobileOptimized: "width",
    HandheldFriendly: "true",

    // ---- 双核浏览器（360、搜狗）强制走 webkit 内核，别用 IE 内核渲染 ----
    renderer: "webkit",

    // ---- UC 浏览器 ----
    "screen-orientation": "portrait",
    browsermode: "application",
    "full-screen": "no",
    // UC 的强制夜间模式会把我们自己的深色配色搅乱
    nightmode: "disable",
    "layoutmode": "fitscreen",
    "imagemode": "force",

    // ---- 微信与 QQ 浏览器的 X5 内核 ----
    "x5-orientation": "portrait",
    "x5-fullscreen": "false",

    // ---- 站长平台验证码，未配置时不输出 ----
    ...(process.env.BAIDU_SITE_VERIFICATION
      ? { "baidu-site-verification": process.env.BAIDU_SITE_VERIFICATION }
      : {}),
    ...(process.env.BYTEDANCE_SITE_VERIFICATION
      ? { "bytedance-verification-code": process.env.BYTEDANCE_SITE_VERIFICATION }
      : {}),
    ...(process.env.SOGOU_SITE_VERIFICATION
      ? { "sogou_site_verification": process.env.SOGOU_SITE_VERIFICATION }
      : {}),
    ...(process.env.SHENMA_SITE_VERIFICATION
      ? { "shenma-site-verification": process.env.SHENMA_SITE_VERIFICATION }
      : {}),
    ...(process.env.QIHOO_SITE_VERIFICATION
      ? { "360-site-verification": process.env.QIHOO_SITE_VERIFICATION }
      : {}),
    ...(process.env.HUAWEI_SITE_VERIFICATION
      ? { "petal-site-verification": process.env.HUAWEI_SITE_VERIFICATION }
      : {}),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // 刘海屏、挖孔屏、底部手势条：内容铺满，边距靠 CSS 的 safe-area 变量兜
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#101124" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/*
          防转码。运营商和百度的移动转码会重排页面、注入广告，
          这两条是业界通行的拒绝声明，必须以 http-equiv 形式出现。
        */}
        <meta httpEquiv="Cache-Control" content="no-transform" />
        <meta httpEquiv="Cache-Control" content="no-siteapp" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
        <LegacyPolyfills />
      </head>
      <body>
        <JsonLd data={websiteSchema()} />
        {children}
      </body>
    </html>
  );
}
