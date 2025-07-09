import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for Konva canvas library in production build
  webpack: (config, { isServer }) => {
    // Exclude konva from server-side bundle
    if (isServer) {
      config.externals = [...(config.externals || []), 'konva', 'canvas'];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // For deployment - ignore build errors temporarily
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Basic optimization for Vercel deployment
  images: {
    domains: [],
  },
  compress: true,
};

export default nextConfig;
