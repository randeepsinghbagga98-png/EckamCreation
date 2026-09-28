import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@eckamcreation/api-contracts",
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
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
