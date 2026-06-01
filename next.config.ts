import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Our webp/png assets are pre-optimized via scripts/process-images.mjs
    // and brand book exports. Next/Image optimization adds no value here and
    // crashes Turbopack dev workers on Windows (jest-worker child exit).
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Product photo uploads travel through a Server Action as FormData. The
      // default 1 MB cap rejects normal phone/camera JPEGs — raise it to match
      // MediaStore's MAX_BYTES (10 MB). The store still validates size itself.
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
