import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server actions take 1 MB by default. Pictures are shrunk in the browser
      // first, but a PNG or a PDF the reception desk attaches can still be
      // several MB, and the per-file ceiling is 10 MB (lib/uploads.ts).
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
