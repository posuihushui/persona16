import Link from "next/link";
import { TypeArt } from "@/components/TypeArt";

/**
 * 两个类型的相处卡。
 *
 * 报告里「和这几类人相处」原来是四张纯文字卡，四条建议长得完全一样，
 * 用户读第三条的时候已经不知道在说谁了。把双方的主视觉并排放在卡头，
 * 中间一条连线，谁和谁就不用再从文字里找。
 *
 * 左边永远是本人的类型，右边是对方，四张卡的左半边因此是同一张图，
 * 变化的只有右半边——这正是这一节要表达的关系。
 */
export function PairCard({
  selfCode,
  otherCode,
  otherName,
  note,
  href,
}: {
  selfCode: string;
  otherCode: string;
  otherName?: string;
  note: string;
  /** 传了就整张卡可点，去这个类型的公开解读 */
  href?: string;
}) {
  const body = (
    <>
      <span className="pair-heads">
        <span className="pair-head">
          <TypeArt code={selfCode} size={40} />
          <b>{selfCode}</b>
        </span>
        <span className="pair-link" aria-hidden="true" />
        <span className="pair-head">
          <TypeArt code={otherCode} size={40} />
          <b>{otherCode}</b>
        </span>
        {otherName && <span className="pair-name">{otherName}</span>}
      </span>
      <span className="pair-note">{note}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="pair-card">
        {body}
      </Link>
    );
  }
  return <div className="pair-card">{body}</div>;
}
