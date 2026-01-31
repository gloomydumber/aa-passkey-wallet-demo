import { describe, it, expect, vi, beforeEach } from "vitest";
import { BalanceService } from "./balance-service";
import type { Token, NativeCurrency } from "@aa-wallet/types";

// Mock viem's PublicClient
const mockClient = {
  getBalance: vi.fn(),
  readContract: vi.fn(),
};

const mockNativeCurrency: NativeCurrency = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
};

const testAddress = "0x1234567890123456789012345678901234567890" as const;

const testToken: Token = {
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  chainId: 1,
};

describe("BalanceService", () => {
  let balanceService: BalanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    balanceService = new BalanceService({
      client: mockClient as never,
      nativeCurrency: mockNativeCurrency,
    });
  });

  describe("getNativeBalance", () => {
    it("should return formatted native balance", async () => {
      // 1.5 ETH in wei
      mockClient.getBalance.mockResolvedValue(1500000000000000000n);

      const result = await balanceService.getNativeBalance(testAddress);

      expect(result).toEqual({
        balance: "1500000000000000000",
        formattedBalance: "1.5",
        symbol: "ETH",
      });
      expect(mockClient.getBalance).toHaveBeenCalledWith({ address: testAddress });
    });

    it("should handle zero balance", async () => {
      mockClient.getBalance.mockResolvedValue(0n);

      const result = await balanceService.getNativeBalance(testAddress);

      expect(result).toEqual({
        balance: "0",
        formattedBalance: "0",
        symbol: "ETH",
      });
    });

    it("should handle very small balance", async () => {
      // 1 wei
      mockClient.getBalance.mockResolvedValue(1n);

      const result = await balanceService.getNativeBalance(testAddress);

      expect(result.balance).toBe("1");
      expect(result.formattedBalance).toBe("0.000000000000000001");
    });
  });

  describe("getTokenBalance", () => {
    it("should return formatted token balance", async () => {
      // 100 USDC (6 decimals)
      mockClient.readContract.mockResolvedValue(100000000n);

      const result = await balanceService.getTokenBalance(testAddress, testToken);

      expect(result).toEqual({
        token: testToken,
        balance: "100000000",
        formattedBalance: "100",
      });
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: testToken.address,
        abi: expect.any(Array),
        functionName: "balanceOf",
        args: [testAddress],
      });
    });

    it("should handle zero token balance", async () => {
      mockClient.readContract.mockResolvedValue(0n);

      const result = await balanceService.getTokenBalance(testAddress, testToken);

      expect(result.balance).toBe("0");
      expect(result.formattedBalance).toBe("0");
    });
  });

  describe("getTokenBalances", () => {
    it("should fetch multiple token balances in parallel", async () => {
      const token2: Token = {
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        chainId: 1,
      };

      mockClient.readContract
        .mockResolvedValueOnce(100000000n) // 100 USDC
        .mockResolvedValueOnce(50000000n); // 50 USDT

      const results = await balanceService.getTokenBalances(testAddress, [testToken, token2]);

      expect(results).toHaveLength(2);
      expect(results[0].formattedBalance).toBe("100");
      expect(results[1].formattedBalance).toBe("50");
    });

    it("should return empty array for no tokens", async () => {
      const results = await balanceService.getTokenBalances(testAddress, []);

      expect(results).toEqual([]);
    });
  });

  describe("getTokenMetadata", () => {
    it("should fetch token metadata from contract", async () => {
      mockClient.readContract
        .mockResolvedValueOnce("USD Coin") // name
        .mockResolvedValueOnce("USDC") // symbol
        .mockResolvedValueOnce(6); // decimals

      const result = await balanceService.getTokenMetadata(testToken.address, 1);

      expect(result).toEqual({
        address: testToken.address,
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        chainId: 1,
      });
    });
  });

  describe("getAllBalances", () => {
    it("should fetch native and token balances together", async () => {
      mockClient.getBalance.mockResolvedValue(1000000000000000000n); // 1 ETH
      mockClient.readContract.mockResolvedValue(100000000n); // 100 USDC

      const result = await balanceService.getAllBalances(testAddress, [testToken]);

      expect(result.native.formattedBalance).toBe("1");
      expect(result.native.symbol).toBe("ETH");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].formattedBalance).toBe("100");
    });
  });
});
