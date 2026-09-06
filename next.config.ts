import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 站点部署在国内服务器，输出 standalone 便于容器化上线。
  output: "standalone",
  poweredByHeader: false,
  // 关掉 Next 自动写 AGENTS.md：macOS 文件系统大小写不敏感，
  // 它会覆盖本仓库自己的 agents.md 约定文件。
  agentRules: false,
  // 内容包是构建期读取的静态 JSON，允许 server 组件直接读文件。
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
