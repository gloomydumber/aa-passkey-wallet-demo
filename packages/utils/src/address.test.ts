import { describe, it, expect } from "vitest";
import { isValidAddress, shortenAddress, normalizeAddress, addressEquals } from "./address";

describe("address utilities", () => {
  describe("isValidAddress", () => {
    it("should return true for valid addresses", () => {
      expect(isValidAddress("0x1234567890123456789012345678901234567890")).toBe(true);
      expect(isValidAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toBe(true);
    });

    it("should return false for invalid addresses", () => {
      expect(isValidAddress("0x123")).toBe(false);
      expect(isValidAddress("not an address")).toBe(false);
      expect(isValidAddress("1234567890123456789012345678901234567890")).toBe(false);
      expect(isValidAddress("")).toBe(false);
    });
  });

  describe("shortenAddress", () => {
    it("should shorten valid addresses", () => {
      expect(shortenAddress("0x1234567890123456789012345678901234567890")).toBe("0x1234...7890");
    });

    it("should use custom char count", () => {
      expect(shortenAddress("0x1234567890123456789012345678901234567890", 6)).toBe(
        "0x123456...567890"
      );
    });

    it("should return original string for invalid addresses", () => {
      expect(shortenAddress("invalid")).toBe("invalid");
    });
  });

  describe("normalizeAddress", () => {
    it("should lowercase valid addresses", () => {
      expect(normalizeAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toBe(
        "0xabcdef1234567890abcdef1234567890abcdef12"
      );
    });

    it("should throw for invalid addresses", () => {
      expect(() => normalizeAddress("invalid")).toThrow("Invalid address");
    });
  });

  describe("addressEquals", () => {
    it("should compare addresses case-insensitively", () => {
      expect(
        addressEquals(
          "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
          "0xabcdef1234567890abcdef1234567890abcdef12"
        )
      ).toBe(true);
    });

    it("should return false for different addresses", () => {
      expect(
        addressEquals(
          "0x1234567890123456789012345678901234567890",
          "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
        )
      ).toBe(false);
    });

    it("should return false for invalid addresses", () => {
      expect(addressEquals("invalid", "0x1234567890123456789012345678901234567890")).toBe(false);
    });
  });
});
