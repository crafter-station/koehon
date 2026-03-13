import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    proxyClientMaxBodySize: 20000000, // 1MB in bytes
  },
};

export default nextConfig;
