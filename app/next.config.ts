import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/core is shipped as TypeScript source.
  transpilePackages: ["@udan/core"],
  poweredByHeader: false,
  // The only image is the logo; serve it as a file rather than through an
  // image service (Cloudflare Workers has none without an extra binding).
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      // Document uploads on the desk (the storage bucket allows 10 MB).
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
