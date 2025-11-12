import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    PORT: process.env.PORT || '5000',
  },
};

export default nextConfig;
