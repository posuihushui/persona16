import { NextResponse } from "next/server";
import { z } from "zod";
import { track, EVENTS } from "@/lib/analytics";
import { loadPack } from "@/lib/content";
import { prisma } from "@/lib/db";
import { score } from "@/lib/scoring";
import { ensureSessionKey } from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().min(1).max(64),
  packVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  answers: z.record(z.string(), z.number().int().min(-10).max(10)),
  source: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  const { slug, answers, source, packVersion } = parsed.data;

  let pack;
  try {
    pack = loadPack(slug);
  } catch {
    return NextResponse.json({ error: "测试不存在" }, { status: 404 });
  }

  if (pack.meta.status !== "published") {
    return NextResponse.json({ error: "测试不存在" }, { status: 404 });
  }
  // 旧页面不能把旧题目的作答交给新版计分；答案仍由客户端保留。
  if (packVersion !== pack.meta.version) {
    return NextResponse.json({ error: "题库已更新，请刷新后重新作答", code: "PACK_VERSION_CHANGED" }, { status: 409 });
  }

  // 必须答完，缺题不允许出结果
  const missing = pack.questions.questions.filter((q) => answers[q.id] === undefined);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "还有题目没有作答", missing: missing.map((q) => q.id) },
      { status: 400 },
    );
  }

  // 只保留内容包里存在的题目，忽略多余字段
  const allowed: Record<string, number> = {};
  const validValues = new Set(pack.questions.scale.options.map((o) => o.value));
  for (const q of pack.questions.questions) {
    const v = answers[q.id];
    if (!validValues.has(v)) {
      return NextResponse.json({ error: `题目 ${q.id} 的作答值不在量表内` }, { status: 400 });
    }
    allowed[q.id] = v;
  }

  const result = score(allowed, pack.questions, pack.scoring);
  const sessionKey = await ensureSessionKey();

  const attempt = await prisma.attempt.create({
    data: {
      sessionKey,
      slug,
      packVersion: pack.meta.version,
      answers: allowed,
      code: result.code,
      dimensions: result.dimensions,
      source,
    },
    select: { id: true },
  });

  await track(sessionKey, EVENTS.quizComplete, {
    slug,
    attemptId: attempt.id,
    props: { code: result.code },
  });

  return NextResponse.json({ attemptId: attempt.id, code: result.code });
}
