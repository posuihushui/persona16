import type { ReactNode } from "react";
import illustrations from "../../content/illustrations.json";
import { SceneArt, hasSceneArt } from "./SceneArt";

type SceneName = keyof typeof illustrations.assets;
type SceneAsset = {
  kind?: string;
  art?: string;
  src?: string;
  width?: number;
  height?: number;
  alt: string;
  title: string;
  description: string;
};

export function illustrationFor(scene: string): SceneAsset | null {
  if (!Object.prototype.hasOwnProperty.call(illustrations.assets, scene)) return null;
  return illustrations.assets[scene as SceneName] as SceneAsset;
}

/**
 * 情境插画。场景与文案来自 content/illustrations.json，组件里不写死画面和描述。
 *
 * 清单声明 kind: "svg" 时渲染内联矢量画面（见 SceneArt），
 * 其余走 <picture>，为还没换成矢量的位图资源保留旧路径。
 */
export function SceneIllustration({
  scene,
  className = "",
  priority = false,
  decorative = false,
  variant = "square",
}: {
  scene: string;
  className?: string;
  priority?: boolean;
  /** 旁边已经有等价文字时传 true，避免读屏重复播报 */
  decorative?: boolean;
  /** banner 是铺满一整块的 8:5 头图，只有矢量场景支持 */
  variant?: "square" | "banner";
}) {
  const asset = illustrationFor(scene);
  if (!asset) return null;

  if (asset.kind === "svg" && asset.art && hasSceneArt(asset.art)) {
    return (
      <div className={`scene-illustration ${className}`}>
        <SceneArt art={asset.art} label={asset.alt} decorative={decorative} variant={variant} />
      </div>
    );
  }

  if (!asset.src) return null;

  return (
    <div className={`scene-illustration ${className}`}>
      <picture>
        <source srcSet={asset.src.replace(/\.png$/, ".webp")} type="image/webp" />
        {/* Both formats are optimized locally; picture also preserves the PNG fallback on older browsers. */}
        <img
          className="scene-image"
          src={asset.src}
          alt={decorative ? "" : asset.alt}
          width={asset.width}
          height={asset.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
        />
      </picture>
    </div>
  );
}

export function SceneSectionHeading({ scene, children }: { scene: string; children: ReactNode }) {
  return (
    <div className="scene-section-heading">
      <SceneIllustration scene={scene} className="scene-section-art" decorative />
      <div className="scene-section-copy">{children}</div>
    </div>
  );
}
