import { describe, it, expect, vi } from "vitest";
import {
  buildTransferCall,
  buildTokenTransferCall,
  encodeCalls,
  createPendingResult,
  createSubmittedResult,
  createSuccessResult,
  createFailedResult,
} from "./userop-service";
import type { Token, SmartAccountInstance } from "@aa-wallet/types";

const testAddress = "0x1234567890123456789012345678901234567890" as const;
const recipientAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const;

const testToken: Token = {
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  chainId: 1,
};

const mockAccount: SmartAccountInstance = {
  address: testAddress,
  signUserOperation: vi.fn(),
  signMessage: vi.fn(),
  encodeExecute: vi.fn().mockResolvedValue("0xencoded"),
  encodeBatchExecute: vi.fn().mockResolvedValue("0xbatchencoded"),
};

describe("UserOp utilities", () => {
  describe("buildTransferCall", () => {
    it("should build a native transfer call", () => {
      const result = buildTransferCall(recipientAddress, 1000000000000000000n);

      expect(result).toEqual({
        to: recipientAddress,
        value: "1000000000000000000",
        data: "0x",
      });
    });

    it("should handle zero value", () => {
      const result = buildTransferCall(recipientAddress, 0n);

      expect(result.value).toBe("0");
      expect(result.data).toBe("0x");
    });
  });

  describe("buildTokenTransferCall", () => {
    it("should build an ERC-20 transfer call", () => {
      const result = buildTokenTransferCall(testToken, recipientAddress, "100");

      expect(result.to).toBe(testToken.address);
      expect(result.value).toBe("0");
      expect(result.data).toMatch(/^0x/);
      // Should contain the transfer function selector (0xa9059cbb)
      expect(result.data.startsWith("0xa9059cbb")).toBe(true);
    });

    it("should handle decimal amounts", () => {
      const result = buildTokenTransferCall(testToken, recipientAddress, "100.5");

      expect(result.to).toBe(testToken.address);
      // 100.5 USDC with 6 decimals = 100500000
      expect(result.data).toMatch(/^0xa9059cbb/);
    });
  });

  describe("encodeCalls", () => {
    it("should encode a single call", async () => {
      const call = buildTransferCall(recipientAddress, 1000n);
      const result = await encodeCalls(mockAccount, [call]);

      expect(mockAccount.encodeExecute).toHaveBeenCalledWith({
        to: recipientAddress,
        value: 1000n,
        data: "0x",
      });
      expect(result).toBe("0xencoded");
    });

    it("should encode batch calls", async () => {
      const call1 = buildTransferCall(recipientAddress, 1000n);
      const call2 = buildTransferCall(testAddress, 2000n);
      const result = await encodeCalls(mockAccount, [call1, call2]);

      expect(mockAccount.encodeBatchExecute).toHaveBeenCalledWith([
        { to: recipientAddress, value: 1000n, data: "0x" },
        { to: testAddress, value: 2000n, data: "0x" },
      ]);
      expect(result).toBe("0xbatchencoded");
    });

    it("should throw for empty calls", async () => {
      await expect(encodeCalls(mockAccount, [])).rejects.toThrow("No calls to encode");
    });
  });

  describe("result helpers", () => {
    const userOpHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as const;
    const txHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as const;

    it("should create pending result", () => {
      const result = createPendingResult(userOpHash);

      expect(result).toEqual({
        userOpHash,
        status: "pending",
      });
    });

    it("should create submitted result", () => {
      const result = createSubmittedResult(userOpHash);

      expect(result).toEqual({
        userOpHash,
        status: "submitted",
      });
    });

    it("should create success result", () => {
      const result = createSuccessResult(userOpHash, txHash, 12345);

      expect(result).toEqual({
        userOpHash,
        txHash,
        blockNumber: 12345,
        status: "success",
      });
    });

    it("should create failed result", () => {
      const result = createFailedResult(userOpHash);

      expect(result).toEqual({
        userOpHash,
        status: "failed",
      });
    });
  });
});
