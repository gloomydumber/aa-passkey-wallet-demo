import { describe, it, expect } from "vitest";
import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  uint8ArrayToBase64Url,
  base64UrlToUint8Array,
  hexToUint8Array,
  uint8ArrayToHex,
} from "./encoding";

describe("encoding utilities", () => {
  describe("base64 encoding", () => {
    it("should encode and decode Uint8Array to base64", () => {
      const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = uint8ArrayToBase64(original);
      const decoded = base64ToUint8Array(encoded);
      expect(decoded).toEqual(original);
    });
  });

  describe("base64url encoding", () => {
    it("should encode and decode Uint8Array to base64url", () => {
      const original = new Uint8Array([72, 101, 108, 108, 111]);
      const encoded = uint8ArrayToBase64Url(original);
      expect(encoded).not.toContain("+");
      expect(encoded).not.toContain("/");
      expect(encoded).not.toContain("=");
      const decoded = base64UrlToUint8Array(encoded);
      expect(decoded).toEqual(original);
    });
  });

  describe("hex encoding", () => {
    it("should convert hex to Uint8Array", () => {
      expect(hexToUint8Array("0x48656c6c6f")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
      expect(hexToUint8Array("48656c6c6f")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it("should convert Uint8Array to hex", () => {
      expect(uint8ArrayToHex(new Uint8Array([72, 101, 108, 108, 111]))).toBe("0x48656c6c6f");
    });
  });
});
