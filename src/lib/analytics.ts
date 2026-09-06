import { prisma } from "./db";

/**
 * 埋点。只记录行为，不记录作答明细。
 * 指标口径见 docs/product/prd-v1.md。
 */
export const EVENTS = {
  landingView: "landing_view",
  quizStart: "quiz_start",
  quizComplete: "quiz_complete",
  resultView: "result_view",
  paywallView: "paywall_view",
  discountClaim: "discount_claim",
  orderCreate: "order_create",
  orderPaid: "order_paid",
  reportView: "report_view",
  shareClick: "share_click",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export async function track(
  sessionKey: string,
  name: string,
  data?: { slug?: string; attemptId?: string; props?: Record<string, unknown> },
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        sessionKey,
        name,
        slug: data?.slug,
        attemptId: data?.attemptId,
        props: data?.props ? (data.props as object) : undefined,
      },
    });
  } catch {
    // 埋点失败不能影响主流程
  }
}
