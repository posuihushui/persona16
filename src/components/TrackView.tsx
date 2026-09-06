"use client";

import { useEffect } from "react";

/** 页面曝光埋点。失败不影响任何功能。 */
export function TrackView({
  name,
  slug,
  attemptId,
  props,
}: {
  name: string;
  slug?: string;
  attemptId?: string;
  props?: Record<string, unknown>;
}) {
  useEffect(() => {
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, attemptId, props }),
      keepalive: true,
    }).catch(() => {});
  }, [name, slug, attemptId, props]);

  return null;
}
