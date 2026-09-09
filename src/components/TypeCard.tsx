import Link from "next/link";
import { toneFor, TypeArt } from "@/components/TypeArt";

/**
 * 类型卡。
 *
 * 站内到处需要「指向某个类型」的入口：类型目录、相关类型、结果页的下一步。
 * 之前这些地方各写各的，有的只有类型码，有的只有一行字，看起来不像同一个东西。
 * 统一成一张卡：主视觉在左，类型码和名字在右，需要时补一行标签。
 *
 * 底色取自类型自己的色板，所以 16 张卡摆在一起是有色序的，不是 16 个灰盒子。
 */
export function TypeCard({
  href,
  code,
  name,
  label,
  size = 44,
  current = false,
}: {
  href: string;
  code: string;
  name: string;
  /** 一句话描述。空间紧张的地方（相关类型两列）不传 */
  label?: string;
  size?: number;
  current?: boolean;
}) {
  const tone = toneFor(code);

  return (
    <Link
      href={href}
      className="type-card"
      aria-current={current ? "page" : undefined}
      data-current={current ? "true" : undefined}
      // 目录页的字母筛选靠这个属性认卡片，卡片本身仍由服务端渲染
      data-type-code={code}
      /*
       * 类型色只做左侧那条色条。
       *
       * 拿它当卡片底色试过一版：类型色板是固定的浅色（它要跟着主视觉一起被截图），
       * 而卡上的文字用主题令牌，深色模式下就变成浅底配浅字。
       * 色条是纯填充，没有文字压在上面，两套色系因此互不干涉。
       */
      style={{ "--card-accent": tone.base } as React.CSSProperties}
    >
      <span className="type-card-art">
        <TypeArt code={code} size={size} />
      </span>
      <span className="type-card-body">
        <b className="type-card-code">{code}</b>
        <span className="type-card-name">{name}</span>
        {label && <span className="type-card-label">{label}</span>}
      </span>
    </Link>
  );
}
