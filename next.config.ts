import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the session cookie and the database, so the whole app is
  // rendered per request. Cache Components stays off to keep that simple.
  cacheComponents: false,
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
