import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't climb to the parent React
  // Native repo (which has its own package-lock.json and confuses module
  // resolution). Must be absolute per Next 16.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
