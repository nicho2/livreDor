import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A separate build directory lets the isolated UI fixture coexist with local dev.
  distDir: process.env.LIVREDOR_UI_FIXTURE === "1" ? ".next-ui" : ".next",
};

export default nextConfig;
