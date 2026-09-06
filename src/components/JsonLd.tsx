/**
 * 结构化数据。搜索引擎和 AI 抓取器都不执行 JavaScript，
 * 所以这个组件必须是 Server Component，内容直接进 HTML。
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // 内容全部来自内容包与环境变量，不含用户输入
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
