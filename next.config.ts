import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A separate build directory lets the isolated UI fixture coexist with local dev.
  distDir: process.env.LIVREDOR_UI_FIXTURE === "1" ? (process.env.LIVREDOR_UI_FIXTURE_PORT ? `.next-ui-${process.env.LIVREDOR_UI_FIXTURE_PORT}` : ".next-ui") : ".next",
  redirects() {
    // Direct access to the fixture's internal Next port bypasses Auth/media proxying.
    // Preserve the path/query while directing the browser to the complete fixture.
    return process.env.LIVREDOR_UI_FIXTURE === "1" ? [{
      source: "/:path*",
      has: [{ type: "header" as const, key: "host", value: `.*:${Number(process.env.LIVREDOR_UI_FIXTURE_PORT ?? 3100) + 1}` }],
      destination: `http://localhost:${process.env.LIVREDOR_UI_FIXTURE_PORT ?? 3100}/:path*`,
      permanent: false,
    }] : [];
  },
};

export default nextConfig;
