import { describe, expect, it } from "vitest";
import { safeUserMessage } from "./api/errors";
import { formatMoney, slugify } from "./format";

describe("admin safe messages", () => {
  it("maps common HTTP statuses to safe copy", () => {
    expect(safeUserMessage(401)).toBe("Sign in required.");
    expect(safeUserMessage(403)).toBe("You do not have permission to perform this action.");
    expect(safeUserMessage(404)).toBe("The requested record was not found.");
    expect(safeUserMessage(409)).toBe("This change conflicts with the current record.");
    expect(safeUserMessage(422)).toBe("The submitted data could not be processed.");
    expect(safeUserMessage(429)).toBe("Too many requests. Please wait and try again.");
    expect(safeUserMessage(500)).toBe("Something went wrong. Please try again.");
  });

  it("never surfaces prisma, secrets, or stack traces", () => {
    const hidden = safeUserMessage(
      500,
      "INTERNAL_ERROR",
      "PrismaClientKnownRequestError postgresql://user:pass@localhost/db stack AI_API_KEY=sk-test",
    );
    expect(hidden).not.toMatch(/prisma|postgresql|AI_API_KEY|stack/i);
    expect(hidden).toBe("Something went wrong. Please try again.");
  });
});

describe("admin formatters", () => {
  it("formats money without inventing values", () => {
    expect(formatMoney(null, "INR")).toBe("—");
    expect(formatMoney("129900", "INR")).toContain("1,299");
  });

  it("slugifies product names", () => {
    expect(slugify("Noir Compact Bag")).toBe("noir-compact-bag");
  });
});
