"use client";

import { useEffect, useRef, useState } from "react";
import type { GuideChapter } from "@/lib/types";

/**
 * 类型解读页的目录条。
 *
 * 做三件事：吸顶显示当前读到哪一节、点一下跳过去、用一条细线显示读到哪儿了。
 * 全部基于滚动位置计算，不依赖 IntersectionObserver —— iOS 12.0/12.1 上没有它，
 * 而这一条正好是本站的兼容基线。
 *
 * 降级路径：没有 JS 时，服务端已经渲染出同样的一排锚点链接，点击照样能跳，
 * 只是不会高亮当前小节。所以这一条在任何内核上都不会变成死链。
 */
export function TypeGuideNav({ chapters }: { chapters: Pick<GuideChapter, "id" | "nav">[] }) {
  const [active, setActive] = useState(chapters[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const barRef = useRef<HTMLDivElement | null>(null);
  const ticking = useRef(false);

  useEffect(() => {
    const read = () => {
      ticking.current = false;

      // 吸顶条自己的高度要算进去，否则跳转后当前节会被条压住
      const offset = (barRef.current?.getBoundingClientRect().height ?? 0) + 72;
      let current = chapters[0]?.id ?? "";
      for (const chapter of chapters) {
        const el = document.getElementById(chapter.id);
        if (el && el.getBoundingClientRect().top <= offset) current = chapter.id;
      }
      setActive(current);

      const first = document.getElementById(chapters[0]?.id ?? "");
      const last = document.getElementById(chapters[chapters.length - 1]?.id ?? "");
      if (first && last) {
        const start = first.offsetTop;
        const end = last.offsetTop + last.offsetHeight;
        const span = Math.max(1, end - start - window.innerHeight * 0.5);
        const done = (window.pageYOffset || document.documentElement.scrollTop) - start;
        setProgress(Math.min(100, Math.max(0, (done / span) * 100)));
      }
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [chapters]);

  /*
   * 大屏上吸顶条是隐藏的，当前小节要标在左侧常驻目录上。
   * 侧栏是服务端渲染的（没有 JS 也要能点），所以这里直接改它的属性，
   * 而不是把那块结构搬进这个组件。
   */
  useEffect(() => {
    const links = document.querySelectorAll<HTMLElement>("[data-side-for]");
    links.forEach((link) => {
      if (link.getAttribute("data-side-for") === active) link.setAttribute("data-active", "true");
      else link.removeAttribute("data-active");
    });
  }, [active]);

  // 当前项滚进目录的可视范围。窄屏目录是横向滚动的，不这样做会看不见高亮
  useEffect(() => {
    const bar = barRef.current;
    const current = bar?.querySelector<HTMLElement>(`[data-for="${active}"]`);
    if (!bar || !current) return;
    const left = current.offsetLeft - bar.clientWidth / 2 + current.offsetWidth / 2;
    if (typeof bar.scrollTo === "function") bar.scrollTo({ left, behavior: "smooth" });
    else bar.scrollLeft = left;
  }, [active]);

  const jump = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return; // 让浏览器按普通锚点处理
    event.preventDefault();
    const offset = (barRef.current?.getBoundingClientRect().height ?? 0) + 60;
    const top = el.getBoundingClientRect().top + (window.pageYOffset || 0) - offset;
    if (typeof window.scrollTo === "function") {
      try {
        window.scrollTo({ top, behavior: "smooth" });
      } catch {
        // 老内核不接受配置对象形式
        window.scrollTo(0, top);
      }
    }
    // 地址栏留下锚点，方便分享到具体一节
    if (window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <div className="guide-bar">
      <div className="guide-bar-scroll" ref={barRef}>
        {chapters.map((chapter) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            className="guide-tab"
            data-for={chapter.id}
            data-active={chapter.id === active ? "true" : undefined}
            onClick={(event) => jump(event, chapter.id)}
          >
            {chapter.nav}
          </a>
        ))}
      </div>
      <div className="guide-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/**
 * 进入视口时淡入上移。
 *
 * 默认就是可见状态，只有脚本跑起来之后才把还没进入视口的部分藏起来，
 * 所以禁用 JS、老内核或抓取器看到的都是完整内容，不会出现整页空白。
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver !== "function") return;

    // 已经在视口里的（首屏）不做隐藏，避免加载后闪一下
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setShown(false);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      data-shown={shown ? "true" : "false"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
