import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve("apps/web/src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "tests/**/*.test.ts",
      "packages/**/*.test.ts",
      "apps/api/**/*.test.ts",
      "apps/web/src/**/*.test.ts",
      "apps/admin/src/**/*.test.ts",
    ],
  },
});
