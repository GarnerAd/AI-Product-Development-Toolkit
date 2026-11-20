import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages read the local database on every request, so they are rendered per request.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
