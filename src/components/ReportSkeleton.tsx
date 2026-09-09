/**
 * 报告版式预览。
 *
 * 付费前用户能读到的只有承诺清单，「一份认真写的报告」到底长什么样全靠想象。
 * 这块画的是报告的骨架：一个封面、一段阶梯、一组双栏、一列带动作的卡。
 *
 * 里面没有一个字是报告正文——全是灰条。这不是打码，是真的没有内容：
 * 付费正文根本不进这个页面的 HTML。画骨架只说明「排版有几种块」，
 * 不透露任何一句写给用户的话。
 */
export function ReportSkeleton({ caption }: { caption: string }) {
  return (
    <figure className="skeleton">
      <div className="skeleton-paper" aria-hidden="true">
        <div className="skeleton-cover">
          <span className="skeleton-square" />
          <span className="skeleton-lines">
            <i style={{ width: "44%" }} />
            <i style={{ width: "72%" }} />
          </span>
        </div>

        <div className="skeleton-ranks">
          {[100, 76, 56, 38].map((w) => (
            <span key={w}>
              <i style={{ width: `${w}%` }} />
            </span>
          ))}
        </div>

        <div className="skeleton-versus">
          <span />
          <span />
        </div>

        <div className="skeleton-cards">
          <span>
            <i style={{ width: "80%" }} />
            <i style={{ width: "52%" }} />
          </span>
          <span>
            <i style={{ width: "66%" }} />
            <i style={{ width: "44%" }} />
          </span>
        </div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
