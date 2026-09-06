import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
      <div className="stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
        <h1 className="h1">这个页面不在了</h1>
        <p className="muted">链接可能过期了，或者地址输错了。</p>
        <Link className="btn" href="/">
          回首页
        </Link>
      </div>
    </main>
  );
}
