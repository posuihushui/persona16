import Link from "next/link";

/**
 * 全站标志。
 *
 * 一个圆（直觉、精力）与一个方（实感、秩序）相交，交叠处套印出第三个颜色。
 * 纯内联 SVG，跟随 currentColor 之外的三色写死在这里：标志不参与主题令牌，
 * 深浅色模式下必须长得一样（它会被截图、被当作 favicon）。
 */
export function BrandMark({ size = 28, tone = "light" }: { size?: number; tone?: "light" | "dark" | "mono" }) {
  const uid = `brand-${tone}`;
  const plate = tone === "light" ? "#eceefa" : "transparent";
  const circle = tone === "dark" ? "#8b96e0" : tone === "mono" ? "#3a3850" : "#5b6abf";
  const square = tone === "dark" ? "#7fb8ac" : tone === "mono" ? "#3a3850" : "#4e8c82";
  const over = tone === "dark" ? "#e8ecff" : tone === "mono" ? "#191723" : "#2f4b7d";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="16型人格测试"
      style={{ display: "block", flex: "none" }}
    >
      <defs>
        <clipPath id={`${uid}-clip`}>
          <circle cx="12.5" cy="12.5" r="8" />
        </clipPath>
      </defs>
      {plate !== "transparent" && <rect width="32" height="32" rx="9" fill={plate} />}
      <circle cx="12.5" cy="12.5" r="8" fill={circle} opacity={tone === "mono" ? 1 : undefined} />
      <rect x="13" y="13" width="12.5" height="12.5" rx="2.5" fill={square} opacity={tone === "mono" ? 0.55 : undefined} />
      <g clipPath={`url(#${uid}-clip)`}>
        <rect x="13" y="13" width="12.5" height="12.5" rx="2.5" fill={over} />
      </g>
    </svg>
  );
}

export function BrandWord() {
  return (
    <span className="brand-word">
      16型<span>人格测试</span>
    </span>
  );
}

/**
 * 吸顶头部。
 *
 * 48px 一条细线，只承担三件事：回到上一层、说明当前是哪一页、一个次要入口。
 * 左右两个槽位固定 56px，标题因此永远居中，不会因为按钮文案长短而偏移。
 * 首页不显示返回，改显示标志。
 *
 * 服务端组件，不带任何 JS：返回是一个真实的链接，抓取器和禁用 JS 的用户都能走。
 */
export function SiteHeader({
  title,
  backHref,
  brand = false,
  action,
}: {
  title: string;
  /** 传入上一层的真实地址；不传就不显示返回 */
  backHref?: string;
  /** 首页用标志代替返回 */
  brand?: boolean;
  action?: { label: string; href: string };
}) {
  return (
    <header className="site-header">
      <div className="site-header-slot">
        {backHref && (
          <Link href={backHref} className="site-header-back" aria-label="返回">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.5 5L8 12l6.5 7" />
            </svg>
          </Link>
        )}
        {!backHref && brand && (
          <Link href="/" className="site-header-back" aria-label="回到首页">
            <BrandMark size={28} />
          </Link>
        )}
      </div>

      <p className="site-header-title">{title}</p>

      <div className="site-header-slot site-header-slot--end">
        {action && (
          <Link href={action.href} className="site-header-action">
            {action.label}
          </Link>
        )}
      </div>
    </header>
  );
}
