import { toneFor, typeArtMarkup } from "@/lib/type-art";
import { loadPack } from "@/lib/content";

export const runtime = "nodejs";

function escapeXml(s: string): string {
  return s.replace(/[<>&'\"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[c] as string,
  );
}

/** 同源 SVG 由浏览器使用本地系统字体转为 PNG，几何始终与类型页共用。 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "persona16";
  const code = url.searchParams.get("code") ?? "";
  const version = url.searchParams.get("version") ?? undefined;
  let pack;
  try { pack = loadPack(slug, version); }
  catch { return new Response("not found", { status: 404 }); }
  const doc = Object.prototype.hasOwnProperty.call(pack.results, code) ? pack.results[code] : null;
  if (!doc || pack.meta.status !== "published") return new Response("not found", { status: 404 });
  const tone = toneFor(code);
  const labelLines = Array.from(doc.label).reduce<string[]>((lines, character, index) => {
    const line = Math.floor(index / 22);
    lines[line] = (lines[line] ?? "") + character;
    return lines;
  }, []);
  const labelSize = labelLines.length > 2 ? 26 : 32;
  const font = "PingFang SC, HarmonyOS Sans SC, MiSans, Microsoft YaHei, sans-serif";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200" font-family="${font}">
    <rect width="900" height="1200" fill="${tone.card}"/>
    <g transform="translate(130 40) scale(1.6)">${typeArtMarkup(code)}</g>
    <g fill="${tone.ink}">
      <text x="64" y="746" font-size="24" letter-spacing="5" opacity="0.7">${escapeXml(pack.meta.name)}</text>
      <text x="60" y="864" font-size="120" font-weight="700" letter-spacing="-3">${escapeXml(doc.code)}</text>
      <text x="64" y="922" font-size="40" font-weight="600">${escapeXml(doc.name)}</text>
      <path d="M64 960h64" stroke="${tone.ink}" stroke-width="3" opacity="0.4"/>
      ${labelLines.map((line, index) => `<text x="64" y="${1008 + index * 44}" font-size="${labelSize}">${escapeXml(line)}</text>`).join("")}
      <text x="64" y="1130" font-size="26" opacity="0.75">${escapeXml(doc.keywords.join(" · "))}</text>
    </g>
  </svg>`;
  return new Response(svg, { headers: {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "public, max-age=3600",
  } });
}
