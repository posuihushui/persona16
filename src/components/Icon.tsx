/**
 * 图标。
 *
 * 全部是线条几何图形，内联 SVG，不加载任何字体图标或图片。
 * 用 currentColor 描边，深浅色自动跟随，不需要两套资源。
 *
 * 它们的作用是给长段落做视觉锚点，让用户扫一眼就知道这一块讲什么，
 * 不是装饰。所以每个图标都要能对上它所标注的内容。
 */

const PATHS: Record<string, React.ReactNode> = {
  // 优势：四角星
  spark: <path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" />,
  // 盲点：看不见的地方
  eye: (
    <>
      <path d="M2 12c3-5 7-7.5 10-7.5S19 7 22 12c-3 5-7 7.5-10 7.5S5 17 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // 工作环境：网格
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  // 关系：两个交叠的圆
  link: (
    <>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </>
  ),
  // 成长：往上的台阶
  steps: <path d="M3 20h5v-5h5v-5h5V5" />,
  // 认知：堆叠的层
  layers: (
    <>
      <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
      <path d="M3 12l9 4.5 9-4.5" />
      <path d="M3 16.5L12 21l9-4.5" />
    </>
  ),
  // 时长
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  // 免费可见
  check: <path d="M4 12.5l5 5L20 6.5" />,
  // 付费解锁
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </>
  ),
  // 题目数量
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.2" />
      <circle cx="4.5" cy="12" r="1.2" />
      <circle cx="4.5" cy="18" r="1.2" />
    </>
  ),
  // 分享
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.3 10.9l7.4-3.7M8.3 13.1l7.4 3.7" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** 带图标的小标题，用来给长段落分块。 */
export function SectionHead({
  icon,
  title,
  hint,
}: {
  icon: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <div className="section-head">
      <span className="section-icon">
        <Icon name={icon} size={18} />
      </span>
      <span>
        <span className="h3">{title}</span>
        {hint && <span className="section-hint">{hint}</span>}
      </span>
    </div>
  );
}
