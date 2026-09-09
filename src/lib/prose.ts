import type { GuideChapter, GuideLayout } from "@/lib/types";

/**
 * 长文本的版式派生。
 *
 * 内容包写的是意思，不是版面。页面要把一段话摆成卡片、阶梯或对照栏时，
 * 需要知道这段话里哪一句是结论、哪一句是解释。这些函数只做这件事，
 * 而且全部按内容自身的形状判断，不认识任何一个具体 slug 或类型码。
 *
 * 拆不出来时一律退回整段原文——版式可以变简单，文字不能被吃掉。
 */

/** 一句话拆成「结论 + 解释」。拆不动时 body 为空，调用方原样显示 lead。 */
export type Split = { lead: string; body: string };

/**
 * 逗号分句。
 *
 * 优势条目写的是「结论，为什么」，前半句独立成话，加粗之后用户扫得到。
 * 前半句太长就不拆了：拆出来的「结论」如果自己就是一整行，加粗反而更糊。
 */
export function splitLead(text: string, maxLead = 16): Split {
  const at = text.indexOf("，");
  if (at <= 0 || at > maxLead) return { lead: text, body: "" };
  const body = text.slice(at + 1).trim();
  if (!body) return { lead: text, body: "" };
  return { lead: text.slice(0, at), body };
}

/**
 * 句号分句。
 *
 * 盲点条目写的是「判断。展开」，第一句就是那条盲点本身。
 * 同样有长度闸门，第一句太长就整条当正文。
 */
export function splitClaim(text: string, maxLead = 22): Split {
  const at = text.indexOf("。");
  if (at <= 0 || at > maxLead) return { lead: text, body: "" };
  const body = text.slice(at + 1).trim();
  if (!body) return { lead: text, body: "" };
  return { lead: text.slice(0, at), body };
}

/** 空行分段。用于把 cognition 这类多段字符串摊成可以逐层排版的数组。 */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * 章节版式。
 *
 * 规则只看这一节有什么，不看它是第几节的 id：
 *   有 good/hard  → 对照版式，不出头图，两栏本身就是画面
 *   有 points     → 瓦片版式，头图保留
 *   其余          → 出图的两节之间左右交替，避免六节长得一模一样
 *
 * 内容包写了 layout 就以它为准。
 */
export function chapterLayout(chapter: GuideChapter, index: number): GuideLayout {
  if (chapter.layout) return chapter.layout;
  if (chapter.good && chapter.hard) return "plain";
  if (chapter.points && chapter.points.length > 0) return "banner";
  if (index === 0) return "banner";
  return index % 2 === 0 ? "split-reverse" : "split";
}
