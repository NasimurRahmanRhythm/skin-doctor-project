import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The console moved from /super-admin to /admin; old bookmarks and links
  // still land in the right place.
  redirects() {
    return [
      { source: "/super-admin", destination: "/admin", permanent: true },
      { source: "/super-admin/:path*", destination: "/admin/:path*", permanent: true },
    ];
  },
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
