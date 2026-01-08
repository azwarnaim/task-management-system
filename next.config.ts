import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark database files as server-only for both webpack and turbopack
  serverExternalPackages: ['better-sqlite3'],
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {},
  
  // Webpack configuration (fallback for --webpack flag)
  webpack: (config, { isServer }) => {
    // Exclude better-sqlite3 from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'better-sqlite3': false,
      };
    }
    return config;
  },
};

export default nextConfig;
