import type { NextConfig } from "next";

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
  async rewrites() {
    // /v1/* is proxied at runtime by app/v1/[...path]/route.ts using API_INTERNAL_URL
    // (build-time rewrites can bake localhost when env is missing during next build).
    return [
      {
        source: "/favicon.ico",
        destination: "/icon.svg",
      },
    ];
  },
};

export default nextConfig;
