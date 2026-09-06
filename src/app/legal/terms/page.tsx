import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "用户协议" };

export default function TermsPage() {
  const entity = process.env.LEGAL_ENTITY_NAME ?? "本站运营方";
  const email = process.env.LEGAL_CONTACT_EMAIL ?? "见页脚客服邮箱";
  const refundDays = process.env.LEGAL_REFUND_WINDOW_DAYS ?? "7";

  return (
    <main className="page" style={{ paddingTop: "3rem", paddingBottom: "2rem" }}>
      <article className="stack" style={{ "--stack-gap": "1.5rem" } as React.CSSProperties}>
        <h1 className="h1">用户协议</h1>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">这是什么服务</h2>
          <p style={{ margin: 0 }}>
            本站提供自我认知参考类的在线测试和文字报告。测试结果描述的是你当下的行为偏好，
            不是能力评价，不是诊断结论，也不构成任何医疗、法律、职业或投资建议。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">免费与付费</h2>
          <p style={{ margin: 0 }}>
            类型结果、维度倾向和基础性格描述免费提供，不需要分享、关注或注册。
            深度报告为付费内容，付费前你已经能看到自己的类型和基础描述。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">退款</h2>
          <p style={{ margin: 0 }}>
            深度报告是一次性交付的数字内容，解锁后即可完整查看，因此不支持无理由退款。
            如果内容与付费页的承诺不符，你可以在 {refundDays} 天内发邮件到 {email} 申请全额退款，
            我们会在核实后原路退回。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">内容使用</h2>
          <p style={{ margin: 0 }}>
            报告内容供你个人使用。你可以自由截图和分享自己的结果页，
            但请不要将付费报告全文转载、批量抓取或用于商业售卖。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">责任范围</h2>
          <p style={{ margin: 0 }}>
            请不要仅依据测试结果做出重大人生决定。因依赖本站内容做出的决定及其后果，
            由你自行承担。服务可能因维护或不可抗力中断，我们会尽力提前告知。
          </p>
        </section>

        <section className="stack" style={{ "--stack-gap": "0.5rem" } as React.CSSProperties}>
          <h2 className="h2">争议处理</h2>
          <p style={{ margin: 0 }}>
            使用中的问题请先联系 {email}。协商不成的，提交至 {entity} 所在地有管辖权的人民法院解决。
          </p>
        </section>

        <SiteFooter />
      </article>
    </main>
  );
}
