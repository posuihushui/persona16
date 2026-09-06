import { NextResponse } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { ensureSessionKey } from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1).max(64),
  slug: z.string().max(64).optional(),
  attemptId: z.string().max(64).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const sessionKey = await ensureSessionKey();
  await track(sessionKey, parsed.data.name, {
    slug: parsed.data.slug,
    attemptId: parsed.data.attemptId,
    props: parsed.data.props as Record<string, unknown> | undefined,
  });
  return NextResponse.json({ ok: true });
}
