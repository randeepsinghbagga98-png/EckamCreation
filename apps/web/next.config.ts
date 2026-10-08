import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://127.0.0.1:3002';

const nextConfig: NextConfig = {
  transpilePackages: [
    "@eckamcreation/api-contracts",
    "@eckamcreation/ui",
    "@eckamcreation/config",
    "@eckamcreation/database",
    "@eckamcreation/auth",
    "@eckamcreation/ai",
    "@eckamcreation/email",
    "@eckamcreation/whatsapp",
    "@eckamcreation/payments",
    "@eckamcreation/search",
    "@eckamcreation/storage",
  ],
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
      },
      {
        source: '/v1/:path*',
        destination: `${API_ORIGIN}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
