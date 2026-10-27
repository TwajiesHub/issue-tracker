import path from "node:path";
import type { NextConfig } from "next";

// demo/ lives inside the Ziki repo but shares nothing with it: pin the root here
// so Next doesn't pick up Ziki's instrumentation.ts or lockfile.
const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
