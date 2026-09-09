import { Icon } from "@/components/Icon";
import type { LockedItem } from "@/lib/types";

/**
 * 报告目录。
 *
 * 付费墙原来是一列十行带锁的文字，十行长得一样，用户读到第四行就开始跳过。
 * 摆成网格之后每一项是一张卡，标题和钩子分两层，扫一遍就知道报告里有几块内容。
 *
 * 卡上只有 paywall.json 里 locked 声明的标题和钩子——那是明确允许公开的字段。
 * 正文一个字都不进这里，截断在服务端已经做完（见 freeView）。
 */
export function ReportOutline({
  items,
  visible = 4,
  moreLabel,
}: {
  items: LockedItem[];
  /** 先露出几张卡，其余收进 details */
  visible?: number;
  moreLabel: string;
}) {
  if (items.length === 0) return null;
  const head = items.slice(0, visible);
  const rest = items.slice(visible);

  return (
    <div className="outline">
      <Grid items={head} />
      {rest.length > 0 && (
        <details className="outline-more">
          <summary>{moreLabel.replace("{count}", String(rest.length))}</summary>
          <Grid items={rest} />
        </details>
      )}
    </div>
  );
}

function Grid({ items }: { items: LockedItem[] }) {
  return (
    <ul className="outline-grid">
      {items.map((item) => (
        <li className="outline-item" key={item.key}>
          <span className="outline-lock" aria-hidden="true">
            <Icon name="lock" size={15} />
          </span>
          <b>{item.title}</b>
          <span>{item.hint}</span>
        </li>
      ))}
    </ul>
  );
}
