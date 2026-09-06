/**
 * 缩略预览。
 *
 * 未付费时正文只给开头一段，底部渐隐。
 *
 * 渐隐只是视觉效果，不是遮挡手段：被隐藏的正文根本没有进入 HTML，
 * 服务端的 freeView() 已经截断了。前端不做隐藏式伪装，
 * 查看源码也拿不到付费内容（agents.md 数据与权限约定）。
 */
export function LockedPreview({
  teaser,
  remaining,
}: {
  teaser: string;
  /** 被截断的正文还剩多少字 */
  remaining?: number;
}) {
  return (
    <div>
      <div className="locked">
        <p className="locked-text">{teaser}</p>
        <span className="locked-fade" aria-hidden="true" />
      </div>
      {remaining !== undefined && remaining > 0 && (
        <p className="locked-more">这段还有 {remaining} 字，和下面十项一起解锁</p>
      )}
    </div>
  );
}
