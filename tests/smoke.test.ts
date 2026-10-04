import { describe, expect, it } from "vitest";
import { cn } from "@eckamcreation/ui";
import { envSchema } from "@eckamcreation/config";

describe("environment smoke", () => {
  it("merges class names without throwing", () => {
    expect(cn("px-2", "px-4", false && "hidden")).toBe("px-4");
  });

  it("accepts empty placeholder environment values", () => {
    const parsed = envSchema.safeParse({
      NODE_ENV: "development",
      DATABASE_URL: "",
      AI_PROVIDER: "",
      AI_API_KEY: "",
      AI_MODEL: "",
    });

    expect(parsed.success).toBe(true);
  });
});
