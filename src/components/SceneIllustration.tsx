import type { ReactNode } from "react";
import illustrations from "../../content/illustrations.json";
import { SceneArt, hasSceneArt } from "./SceneArt";

type SceneName = keyof typeof illustrations.assets;
type SceneAsset = {
  kind?: string;
  art?: string;
  src?: string;
  webpSrc?: string;
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
 * 其余走 <picture>。高纹理插画可以直接使用 JPEG；PNG 资源仍会自动尝试
 * 同名 WebP，也可以在清单中显式声明 webpSrc。
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
  /** banner 使用中央安全区裁成铺满一整块的 8:5 头图 */
  variant?: "square" | "banner";
}) {
  const asset = illustrationFor(scene);
  if (!asset) return null;

  if (asset.kind === "svg" && asset.art && hasSceneArt(asset.art)) {
    return (
      <div className={`scene-illustration scene-illustration--${variant} ${className}`}>
        <SceneArt art={asset.art} label={asset.alt} decorative={decorative} variant={variant} />
      </div>
    );
  }

  if (!asset.src) return null;

  const webpSrc = asset.webpSrc
    ?? (asset.src.endsWith(".png") ? asset.src.replace(/\.png$/, ".webp") : undefined);

  return (
    <div className={`scene-illustration scene-illustration--${variant} ${className}`}>
      <picture>
        {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
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
