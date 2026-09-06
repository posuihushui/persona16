import Link from "next/link";

/** 用户权利入口必须常驻可见，不能只存在于文档里。 */
export function SiteFooter() {
  const entity = process.env.LEGAL_ENTITY_NAME;
  const icp = process.env.LEGAL_ICP_NUMBER;
  const email = process.env.LEGAL_CONTACT_EMAIL;

  return (
    <footer className="small muted page-bottom" style={{ paddingTop: "2rem" }}>
      <hr className="divider" />
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link href="/legal/privacy">隐私政策</Link>
        {" · "}
        <Link href="/legal/terms">用户协议</Link>
        {" · "}
        <Link href="/retrieve">找回我的报告</Link>
      </p>
      {entity && <p style={{ margin: 0 }}>{entity}</p>}
      {email && <p style={{ margin: 0 }}>客服邮箱 {email}</p>}
      {icp && (
        <p style={{ margin: 0 }}>
          <a href="https://beian.miit.gov.cn/" rel="noreferrer noopener" target="_blank">
            {icp}
          </a>
        </p>
      )}
    </footer>
  );
}
