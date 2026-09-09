import { Icon, type IconName } from "@/components/Icon";

export type Step = { title: string; description: string; icon?: string };

/**
 * 三步流程。
 *
 * 「答题 → 拿到类型卡 → 想看更深再看报告」这件事原本只写在段落里，
 * 用户要读完才知道免费到哪儿、付费从哪儿开始。排成带序号的卡之后，
 * 不读文字也能看出一共三步，以及自己现在在第几步。
 *
 * 文案和图标都来自内容文件，组件不写死任何一步。
 */
export function StepFlow({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null;

  return (
    <ol className="steps">
      {steps.map((step, i) => (
        <li className="step" key={step.title}>
          <span className="step-index" aria-hidden="true">
            {i + 1}
          </span>
          <span className="step-body">
            <span className="step-title">
              {step.icon && <Icon name={step.icon as IconName} size={17} />}
              <b>{step.title}</b>
            </span>
            <span className="step-desc">{step.description}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
