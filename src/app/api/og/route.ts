import { toneFor, typeArtMarkup } from "@/components/TypeArt";
import { loadPack } from "@/lib/content";

export const runtime = "nodejs";

/**
 * 结果分享卡。
 *
 * 用 SVG 而不是位图渲染，因为位图方案需要内嵌中文字体，
 * 一个 CJK 字体子集会让部署体积和冷启动都变差。SVG 由客户端用系统字体渲染，
 * 中文显示正常。微信 JS-SDK 分享缩略图要求位图，那部分用
 * public/share/<CODE>.png 的静态图，生成方式见 docs/design/share-card.md。
 *
 * 画面直接复用 TypeArt，不另写一套几何。两边各写一份迟早会对不上，
 * 而分享卡和结果页长得不一样是很难被发现的那类问题。
 *
 * 卡片只包含类型码和人设标签，不含用户任何个人信息。
 */
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "persona16";
  const code = url.searchParams.get("code") ?? "";

  let pack;
  try {
    pack = loadPack(slug);
  } catch {
    return new Response("not found", { status: 404 });
  }

  const doc = pack.results[code];
  if (!doc) return new Response("not found", { status: 404 });

  const tone = toneFor(code);
  // 复用同一份几何，画面与结果页完全一致
  const art = typeArtMarkup(code);

  const font = "PingFang SC, HarmonyOS Sans SC, MiSans, Microsoft YaHei, sans-serif";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200" font-family="${font}">
  <rect width="900" height="1200" fill="${tone.card}"/>
  <g transform="scale(2.25)">${art}</g>
  <g fill="${tone.ink}">
    <text x="64" y="1000" font-size="26" letter-spacing="6" opacity="0.6">${escapeXml(pack.meta.name)}</text>
    <text x="60" y="1092" font-size="112" font-weight="700" letter-spacing="-3">${escapeXml(doc.code)}</text>
    <text x="64" y="1140" font-size="38" font-weight="600">${escapeXml(doc.name)}</text>
    <text x="64" y="1180" font-size="28" opacity="0.8">${escapeXml(doc.label)}</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
