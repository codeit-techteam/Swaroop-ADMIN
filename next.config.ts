import type { NextConfig } from "next";

/**
 * Local dev: the deployed backend only allows CORS from deployed frontends, so
 * set API_PROXY_TARGET and point NEXT_PUBLIC_API_BASE_URL at `/api/v1` to call
 * it same-origin through Next instead. Only `/api/v1/*` is proxied so the
 * admin's own route handlers under `/api` keep working.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-f184fe06f7d24c68978e25682f5fd785.r2.dev",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-table", "recharts", "date-fns"],
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
