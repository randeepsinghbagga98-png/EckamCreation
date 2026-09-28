import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
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
};

export default nextConfig;
