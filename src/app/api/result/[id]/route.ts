import { NextResponse } from "next/server";
import { freeView, loadPack } from "@/lib/content";
import { prisma } from "@/lib/db";
import { hasPaidAccess } from "@/lib/entitlement";
import { readSessionKey } from "@/lib/session";
import type { DimensionScore } from "@/lib/types";

export const runtime = "nodejs";

/**
 * 免费结果对任何持链接的人可见，这是传播机制。
 * 付费字段绝不出现在这个响应里，付费内容走 /r/[id]/report 的服务端渲染。
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const attempt = await prisma.attempt.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true, code: true, dimensions: true, packVersion: true },
  });
  if (!attempt) return NextResponse.json({ error: "结果不存在" }, { status: 404 });

  const pack = loadPack(attempt.slug);
  const doc = pack.results[attempt.code];
  if (!doc) return NextResponse.json({ error: "结果内容缺失" }, { status: 500 });

  const sessionKey = await readSessionKey();
  const paid = await hasPaidAccess(attempt.id, { sessionKey });

  return NextResponse.json({
    attemptId: attempt.id,
    slug: attempt.slug,
    packVersion: attempt.packVersion,
    code: attempt.code,
    dimensions: attempt.dimensions as unknown as DimensionScore[],
    result: freeView(doc, pack.paywall),
    paid,
    disclaimer: pack.meta.disclaimer,
  });
}
