import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    proxyClientMaxBodySize: '1gb',
  },
};

export default nextConfig;
