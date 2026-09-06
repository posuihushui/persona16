import { llmsTxt } from "@/lib/llms";

export const dynamic = "force-static";

/** https://llmstxt.org 约定的站点索引，给 AI 抓取器和回答引擎读。 */
export function GET() {
  return new Response(llmsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
