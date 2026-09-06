import type { MetadataRoute } from "next";
import { listPublishedPacks, listResultCodes } from "@/lib/content";
import { absolute } from "@/lib/seo";

/**
 * sitemap 只收录可索引的静态内容。
 * `/r/<attemptId>` 是用户的个人结果页，不进 sitemap 也不允许索引。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const packs = listPublishedPacks();

  const entries: MetadataRoute.Sitemap = [
    { url: absolute("/"), changeFrequency: "weekly", priority: 1 },
  ];

  for (const pack of packs) {
    const slug = pack.meta.slug;
    const lastModified = new Date(pack.meta.updatedAt);

    entries.push({
      url: absolute(`/t/${slug}`),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    });
    entries.push({
      url: absolute(`/t/${slug}/type`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    });

    for (const code of listResultCodes(pack)) {
      entries.push({
        url: absolute(`/t/${slug}/type/${code}`),
        lastModified,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  entries.push(
    { url: absolute("/legal/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absolute("/legal/terms"), changeFrequency: "yearly", priority: 0.2 },
  );

  return entries;
}
