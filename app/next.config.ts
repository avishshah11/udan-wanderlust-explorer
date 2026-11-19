import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/core is shipped as TypeScript source.
  transpilePackages: ["@udan/core"],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Document uploads on the desk (the storage bucket allows 10 MB).
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
