import type { NextConfig } from "next";

// Cache Components (cacheComponents / partialPrefetching) is left off on purpose: every page
// fetches its data in the browser, so the classic App Router model is simpler and sufficient.
const nextConfig: NextConfig = {
  // Tailwind CSS v4 is compiled by its Turbopack loader.
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
