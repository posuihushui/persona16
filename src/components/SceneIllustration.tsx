import type { ReactNode } from "react";
import illustrations from "../../content/illustrations.json";

type SceneName = keyof typeof illustrations.assets;

export function illustrationFor(scene: string) {
  if (!Object.prototype.hasOwnProperty.call(illustrations.assets, scene)) return null;
  return illustrations.assets[scene as SceneName];
}

/** Local editorial scenes are selected by the content manifest, independently of type geometry. */
export function SceneIllustration({
  scene,
  className = "",
  priority = false,
}: {
  scene: string;
  className?: string;
  priority?: boolean;
}) {
  const asset = illustrationFor(scene);
  if (!asset) return null;

  return (
    <div className={`scene-illustration ${className}`}>
      <picture>
        <source srcSet={asset.src.replace(/\.png$/, ".webp")} type="image/webp" />
        {/* Both formats are optimized locally; picture also preserves the PNG fallback on older browsers. */}
        <img
          className="scene-image"
          src={asset.src}
          alt={asset.alt}
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
      <SceneIllustration scene={scene} className="scene-section-art" />
      <div className="scene-section-copy">{children}</div>
    </div>
  );
}
