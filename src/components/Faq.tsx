import type { FaqItem } from "@/lib/types";

/**
 * FAQ 区块。用原生 details 而不是 JS 折叠，因为不执行 JavaScript 的抓取器
 * 也要能读到答案全文。details 的内容在 HTML 里始终存在。
 */
export function Faq({ items, title = "常见问题" }: { items: FaqItem[]; title?: string }) {
  if (items.length === 0) return null;

  return (
    <section className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
      <h2 className="h2">{title}</h2>
      {items.map((item) => (
        <details key={item.q} className="card faq-item">
          <summary className="h3">{item.q}</summary>
          <p className="small" style={{ margin: "0.75rem 0 0" }}>
            {item.a}
          </p>
        </details>
      ))}
    </section>
  );
}
