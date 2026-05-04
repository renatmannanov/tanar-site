import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Our webp/png assets are pre-optimized via scripts/process-images.mjs
    // and brand book exports. Next/Image optimization adds no value here and
    // crashes Turbopack dev workers on Windows (jest-worker child exit).
    unoptimized: true,
  },
};

export default nextConfig;
