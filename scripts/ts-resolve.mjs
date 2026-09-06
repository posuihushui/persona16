/**
 * Node 直接运行 TypeScript 时的模块解析钩子。
 *
 * 源码里的相对导入是不带扩展名的（打包器的惯例），但 Node 的 ESM 解析要求
 * 显式扩展名。这个钩子在解析失败时依次补 .ts / .tsx / /index.ts 再试一次。
 *
 * 只影响运维脚本，不影响 Next.js 构建。
 */
const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    const hasExtension = /\.[cm]?[jt]sx?$/.test(specifier);
    if (!relative || hasExtension) throw err;

    for (const ext of CANDIDATES) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {
        // 试下一个
      }
    }
    throw err;
  }
}
