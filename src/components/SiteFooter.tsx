import Link from "next/link";
import { BrandMark, BrandWord } from "@/components/SiteHeader";

/** 内容包不可用时的兜底顺序（按 I/E × ST/SF/NF/NT 排）。有 pack 的页面请传 codes。 */
const FALLBACK_CODES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
];

/**
 * 全站底部。
 *
 * 原来只有三条法务链接。现在它同时承担四件事，因为这是每一页的唯一收口：
 * 说明这个站是什么、给一个再进入的动作、把 16 个类型页交出去（内链与索引）、
 * 放齐法务与联系方式。用户权利入口仍然常驻可见。
 *
 * 公众号二维码由运营提供，配了 NEXT_PUBLIC_WECHAT_QR 才渲染，
 * 没配就整块不出现，不留空盒子。
 */
export function SiteFooter({
  slug = "persona16",
  codes = FALLBACK_CODES,
  cta = { label: "开始测试，约 8 分钟", href: "/t/persona16/quiz" },
}: {
  slug?: string;
  /** 类型码来自内容包，页面有 pack 时传 listResultCodes(pack) */
  codes?: string[];
  cta?: { label: string; href: string } | null;
}) {
  const entity = process.env.LEGAL_ENTITY_NAME;
  const icp = process.env.LEGAL_ICP_NUMBER;
  const email = process.env.LEGAL_CONTACT_EMAIL;
  const qr = process.env.NEXT_PUBLIC_WECHAT_QR;

  return (
    <footer className="site-footer page-bottom">
      <div className="footer-brand">
        <BrandMark size={30} />
        <div>
          <p className="footer-word">
            <BrandWord />
          </p>
          <p className="footer-tagline">从日常的小选择，读懂自己的偏好，不给人贴标签。</p>
        </div>
      </div>

      {cta && (
        <Link className="btn btn-ghost btn-block" href={cta.href}>
          {cta.label}
        </Link>
      )}

      <div className="footer-block">
        <p className="footer-head">{codes.length} 种类型解读</p>
        <div className="footer-types">
          {codes.map((code) => (
            <Link key={code} href={`/t/${slug}/type/${code}`} className="footer-type">
              {code}
            </Link>
          ))}
        </div>
      </div>

      {qr && (
        <div className="footer-block footer-qr">
          <img src={qr} alt="公众号二维码" width={96} height={96} loading="lazy" />
          <div>
            <p className="footer-head">测完想收着</p>
            <p className="footer-tagline">关注后可以在公众号里找回自己的类型和报告。</p>
          </div>
        </div>
      )}

      <div className="footer-block footer-legal">
        <p>
          <Link href="/legal/privacy">隐私政策</Link>
          {" · "}
          <Link href="/legal/terms">用户协议</Link>
          {" · "}
          <Link href="/retrieve">找回我的报告</Link>
        </p>
        <p>
          本测试是自我认知参考工具，不是心理诊断，也不构成医学建议。若持续的情绪困扰已影响生活，
          请联系专业心理服务，或拨打全国心理援助热线 12356。
        </p>
        {entity && <p>{entity}</p>}
        <p>
          {email && <>客服邮箱 {email}</>}
          {email && icp && "　·　"}
          {icp && (
            <a href="https://beian.miit.gov.cn/" rel="noreferrer noopener" target="_blank">
              {icp}
            </a>
          )}
        </p>
      </div>
    </footer>
  );
}
