import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/**
 * PWA manifest。
 *
 * 国产厂商浏览器（华为、小米、OPPO、vivo、UC、QQ）都支持「添加到桌面」，
 * 有 manifest 时会用这里的名称和图标，没有时会退化成截图加默认地球图案。
 * 这是把 H5 留在用户桌面上的最低成本手段，比引导下载 App 现实得多。
 *
 * display 用 standalone：从桌面打开时不显示浏览器地址栏，观感接近原生。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "16型人格测试",
    short_name: SITE_NAME,
    description:
      "免费 16 型人格测试，48 道情境题，8 分钟出结果。给出类型码、四维度倾向强度和完整性格描述。",
    start_url: "/?from=homescreen",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfaf7",
    theme_color: "#5b6abf",
    lang: "zh-CN",
    dir: "ltr",
    categories: ["lifestyle", "education"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Android 自适应图标会裁掉外圈，图案已经留了 22% 安全边
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
