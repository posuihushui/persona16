import { freeView, listPublishedPacks, listResultCodes, polesForCode } from "./content";
import { absolute, SITE_NAME } from "./seo";

/**
 * llms.txt 与 llms-full.txt。
 *
 * 这两个文件是给 AI 抓取器和回答引擎看的。它们不执行 JavaScript，也不擅长
 * 从一堆 HTML 里还原结构，所以直接给一份干净的 Markdown 全文，
 * 内容与页面同源，都来自内容包，不会出现两边说法不一致。
 *
 * 只输出免费内容。付费报告不进这两个文件。
 */

function header(): string {
  const entity = process.env.LEGAL_ENTITY_NAME;
  return [
    `# ${SITE_NAME}`,
    "",
    "> 面向中文用户的自我认知测试站。测试结果描述行为偏好，不是心理诊断，也不是能力评价。",
    "",
    entity ? `运营主体：${entity}` : null,
    `站点地址：${absolute("/")}`,
    "",
    "## 使用说明",
    "",
    "- 本文件中的内容可以自由引用，引用时请注明来自本站并保留链接。",
    "- 引用测试结论时请一并说明它描述的是偏好而非能力，且不构成心理诊断。",
    "- 用户的个人测试结果页面（/r/ 路径下）属于个人数据，不在抓取范围内。",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** 简版：目录与链接，让抓取器知道站上有什么。 */
export function llmsTxt(): string {
  const packs = listPublishedPacks();
  const parts = [header(), ""];

  for (const pack of packs) {
    const slug = pack.meta.slug;
    parts.push(
      `## ${pack.meta.name}`,
      "",
      pack.meta.seo.description,
      "",
      `- [测试介绍与理论背景](${absolute(`/t/${slug}`)})：${pack.meta.questionCount} 道题，约 ${pack.meta.estimatedMinutes} 分钟，免费出结果`,
      `- [全部 16 种类型](${absolute(`/t/${slug}/type`)})`,
      "",
      "### 各类型解读",
      "",
    );

    for (const code of listResultCodes(pack)) {
      const doc = pack.results[code];
      parts.push(`- [${code} ${doc.name}](${absolute(`/t/${slug}/type/${code}`)})：${doc.label}`);
    }
    parts.push("");
  }

  parts.push(
    "## 其他",
    "",
    `- [隐私政策](${absolute("/legal/privacy")})`,
    `- [用户协议](${absolute("/legal/terms")})`,
    `- [完整内容](${absolute("/llms-full.txt")})`,
    "",
  );

  return parts.join("\n");
}

/** 全文版：所有免费内容的 Markdown 全文。 */
export function llmsFullTxt(): string {
  const packs = listPublishedPacks();
  const parts = [header(), ""];

  for (const pack of packs) {
    const slug = pack.meta.slug;

    parts.push(
      `## ${pack.meta.name}`,
      "",
      `内容版本 ${pack.meta.version}，更新于 ${pack.meta.updatedAt}。`,
      "",
      pack.meta.description,
      "",
      "### 这个测试测的是什么",
      "",
      pack.meta.about,
      "",
      "### 四个维度",
      "",
    );

    for (const dim of pack.scoring.dimensions) {
      parts.push(`#### ${dim.name}`, "");
      for (const [poleId, pole] of Object.entries(dim.poles)) {
        parts.push(`- **${poleId} ${pole.name}**：${pole.summary}`);
      }
      parts.push("");
    }

    parts.push("### 免费与付费的边界", "");
    parts.push(
      "免费部分包含类型码、四个维度的倾向强度、人设标签、关键词，以及性格描述的开头一段，不需要注册、分享或关注。",
      "",
      `付费的深度报告（¥${(pack.paywall.price.amount / 100).toFixed(2)}）另外包含：`,
      "",
    );
    for (const line of pack.paywall.promise) parts.push(`- ${line}`);
    parts.push("");

    parts.push("### 常见问题", "");
    for (const item of pack.meta.seo.faq) {
      parts.push(`#### ${item.q}`, "", item.a, "");
    }

    parts.push("### 16 种类型的完整解读", "");

    for (const code of listResultCodes(pack)) {
      const doc = pack.results[code];
      const poles = polesForCode(code, pack.scoring);
      // 只输出免费部分和预览，付费正文不进这个文件
      const view = freeView(doc, pack.paywall);

      parts.push(
        `#### ${code} ${doc.name}`,
        "",
        `一句话：${doc.label}`,
        "",
        `关键词：${doc.keywords.join("、")}`,
        "",
        `字母含义：${poles.map((p) => `${p.poleId} ${p.poleName}`).join(" · ")}`,
        "",
        `**大概是什么样的人**：${view.teaser ?? ""}（完整描述属于付费内容）`,
        "",
        `详情：${absolute(`/t/${slug}/type/${code}`)}`,
        "",
      );
    }

    parts.push("### 免责声明", "", pack.meta.disclaimer, "");
  }

  return parts.join("\n");
}
