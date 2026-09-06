import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "隐私政策" };

/** 隐私政策必须覆盖实际收集的每一项，改动数据收集行为时同步更新这里。 */
export default function PrivacyPage() {
  const entity = process.env.LEGAL_ENTITY_NAME ?? "本站运营方";
  const email = process.env.LEGAL_CONTACT_EMAIL ?? "见页脚客服邮箱";

  return (
    <main className="page" style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
      <article className="stack" style={{ "--stack-gap": "1.5rem" } as React.CSSProperties}>
        <h1 className="h1">隐私政策</h1>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">我们收集什么</h2>
          <ul
            className="stack"
            style={{ "--stack-gap": "0.375rem", margin: 0, paddingLeft: "1.1rem" } as React.CSSProperties}
          >
            <li>你的作答内容，也就是每道题你选了哪个选项，以及由此计算出的类型结果。</li>
            <li>一个随机生成的匿名浏览器标识，存在你设备的 Cookie 里，用来把作答和订单归到同一个人。</li>
            <li>如果你在微信内完成付费，我们会获取你的微信 openid，仅用于确认订单归属和支持你换设备找回报告。</li>
            <li>页面访问和按钮点击这类行为埋点，用于分析产品在哪一步流失。</li>
            <li>支付平台返回的订单号、金额和支付状态。</li>
          </ul>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">我们不收集什么</h2>
          <p style={{ margin: 0 }}>
            我们不收集你的姓名、身份证号、手机号、住址、生物特征和精确位置。测试过程中
            不会要求你填写这些信息，也没有任何环节需要你注册账号。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">我们怎么用这些信息</h2>
          <p style={{ margin: 0 }}>
            作答内容用于生成并复现你的结果报告。行为埋点在聚合之后用于优化题目和页面。
            微信 openid 和订单信息用于确认你的付费权益。我们不出售你的信息，
            也不会把你的作答明细提供给第三方广告平台。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">保存多久</h2>
          <p style={{ margin: 0 }}>
            作答记录会一直保留，这样你随时回来都能看到当初那份报告。你可以随时要求删除。
            删除后作答内容不可恢复，我们只会保留支付审计需要的最小记录。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">你的权利</h2>
          <p style={{ margin: 0 }}>
            你可以要求查阅、更正或删除你的作答和订单信息。发邮件到 {email}，
            附上你的找回码或结果页链接即可。我们会在 15 个工作日内处理。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">未成年人</h2>
          <p style={{ margin: 0 }}>
            如果你未满 14 周岁，请在监护人陪同下使用本站。监护人可以通过上述邮箱
            要求删除相关信息。
          </p>
        </section>

        <p className="small muted" style={{ margin: 0 }}>
          本政策由 {entity} 负责解释。政策更新时会在本页公布。
        </p>

        <SiteFooter />
      </article>
    </main>
  );
}
