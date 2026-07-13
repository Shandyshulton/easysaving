import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? (process.env.NODE_ENV === "production" ? ".next-build" : ".next"),
  devIndicators: false,
  allowedDevOrigins: [
    "10.10.2.169:3000",
    "http://10.10.2.169:3000",
    "localhost:3000",
    "http://localhost:3000",
    "*.local:3000"
  ]
};

export default nextConfig;
