import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/admin/dashboard', destination: '/', permanent: false },
      { source: '/admin/calendar', destination: '/', permanent: false },
    ];
  },
};

export default nextConfig;
