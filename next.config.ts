import { existsSync, readFileSync } from "node:fs";
import type { NextConfig } from "next";

function readBuildId(): string {
  if (existsSync(".env.build")) {
    const m = readFileSync(".env.build", "utf8").match(/NEXT_PUBLIC_BUILD_ID=(.+)/);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return process.env.NEXT_PUBLIC_BUILD_ID?.trim() || "unknown";
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BUILD_ID: readBuildId(),
  },
  experimental: {
    optimizePackageImports: ['swr'],
  },
  async redirects() {
    return [
      { source: '/admin/dashboard', destination: '/', permanent: false },
      { source: '/admin/calendar', destination: '/', permanent: false },
    ];
  },
};

export default nextConfig;
