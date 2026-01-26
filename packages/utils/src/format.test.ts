import { describe, it, expect } from "vitest";
import { formatUnits, parseUnits, formatBalance, formatRelativeTime } from "./format";

describe("format utilities", () => {
  describe("formatUnits", () => {
    it("should format bigint values correctly", () => {
      expect(formatUnits(BigInt("1000000000000000000"), 18)).toBe("1");
      expect(formatUnits(BigInt("1500000000000000000"), 18)).toBe("1.5");
      expect(formatUnits(BigInt("123456789"), 6)).toBe("123.456789");
    });

    it("should handle string values", () => {
      expect(formatUnits("1000000000000000000", 18)).toBe("1");
    });

    it("should handle zero", () => {
      expect(formatUnits(BigInt(0), 18)).toBe("0");
    });
  });

  describe("parseUnits", () => {
    it("should parse string values to bigint", () => {
      expect(parseUnits("1", 18)).toBe(BigInt("1000000000000000000"));
      expect(parseUnits("1.5", 18)).toBe(BigInt("1500000000000000000"));
      expect(parseUnits("0.1", 18)).toBe(BigInt("100000000000000000"));
    });

    it("should handle integer strings", () => {
      expect(parseUnits("100", 6)).toBe(BigInt("100000000"));
    });
  });

  describe("formatBalance", () => {
    it("should format balance with symbol", () => {
      expect(formatBalance(BigInt("1000000000000000000"), 18, "ETH")).toBe("1 ETH");
      expect(formatBalance(BigInt("1234567890000000000"), 18, "ETH", 2)).toBe("1.23 ETH");
    });
  });

  describe("formatRelativeTime", () => {
    it("should format recent times as 'Just now'", () => {
      expect(formatRelativeTime(Date.now() - 30000)).toBe("Just now");
    });

    it("should format minutes ago", () => {
      expect(formatRelativeTime(Date.now() - 5 * 60 * 1000)).toBe("5m ago");
    });

    it("should format hours ago", () => {
      expect(formatRelativeTime(Date.now() - 2 * 60 * 60 * 1000)).toBe("2h ago");
    });

    it("should format days ago", () => {
      expect(formatRelativeTime(Date.now() - 3 * 24 * 60 * 60 * 1000)).toBe("3d ago");
    });
  });
});
