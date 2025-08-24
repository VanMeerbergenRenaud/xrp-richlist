import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  experimental: isDev
    ? {}
    : {
        turbo: {
          rules: {
            "*.svg": {
              loaders: ["@svgr/webpack"],
              as: "*.js",
            },
          },
        },
      },
  // Optimise pour Docker
  output: "standalone",
};

export default nextConfig;
