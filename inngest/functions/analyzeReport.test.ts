import { describe, it, expect } from "vitest";
import { computeDateRange, isPersian } from "./analyzeReport";

describe("isPersian", () => {
  it("detects Persian text", () => {
    expect(isPersian("سلام دنیا")).toBe(true);
    expect(isPersian("Tehran")).toBe(false);
  });
});

describe("computeDateRange", () => {
  it("uses custom range when provided", () => {
    const { startPublishedDate, endPublishedDate } = computeDateRange(
      "custom",
      "2025-01-01",
      "2025-01-07"
    );
    expect(startPublishedDate).toContain("2025-01-01");
    expect(endPublishedDate).toContain("2025-01-07");
  });

  it("defaults to a recent start date for last24h", () => {
    const before = Date.now();
    const { startPublishedDate } = computeDateRange("last24h");
    expect(startPublishedDate).toBeTruthy();
    const start = new Date(startPublishedDate as string).getTime();
    expect(start).toBeLessThan(before);
    expect(start).toBeGreaterThan(before - 1000 * 60 * 60 * 48);
  });
});
