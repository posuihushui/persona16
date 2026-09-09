import { toneFor, typeArtMarkup } from "@/lib/type-art";
import { loadPack } from "@/lib/content";
import { posterCardMarkup } from "@/lib/poster";
import ui from "../../../../content/ui.json";

export const runtime = "nodejs";

/**
 * 同源 SVG，由浏览器用本地系统字体转成 PNG。
 *
 * 版面来自 src/lib/poster.ts，和结果页那张海报共用同一份模型，
 * 几何来自 typeArtMarkup，两边不会各画一套。
 *
 * 这是公开类型卡，会被转发出去，所以不含任何一次作答的数据：
 * 没有四条轴的位置，也没有 attemptId。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "persona16";
  const code = url.searchParams.get("code") ?? "";
  const version = url.searchParams.get("version") ?? undefined;

  let pack;
  try {
    pack = loadPack(slug, version);
  } catch {
    return new Response("not found", { status: 404 });
  }
  const doc = Object.prototype.hasOwnProperty.call(pack.results, code) ? pack.results[code] : null;
  if (!doc || pack.meta.status !== "published") return new Response("not found", { status: 404 });

  // 印章绕圈的小字：重复测试名填满一圈，够长才不会在圆上留出一段空白
  let ring = "";
  while (Array.from(ring).length < 16) ring += `${pack.meta.name}　·　`;

  const svg = posterCardMarkup({
    code: doc.code,
    name: doc.name,
    label: doc.label,
    creed: doc.creed,
    creedLabel: ui.share.creedLabel,
    // 旧内容包没有 tags 时退回三个关键词，历史版本照样能出卡
    tags: doc.tags?.length ? doc.tags.slice(0, 6) : doc.keywords,
    brand: pack.meta.name,
    ring,
    tone: toneFor(code),
    artMarkup: typeArtMarkup(code),
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
