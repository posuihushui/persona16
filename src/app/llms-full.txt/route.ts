import { llmsFullTxt } from "@/lib/llms";

export const dynamic = "force-static";

/** 全部免费内容的 Markdown 全文，付费报告不在其中。 */
export function GET() {
  return new Response(llmsFullTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
