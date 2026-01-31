/**
 * Balance Service
 * Queries native and ERC-20 token balances
 */

import { type PublicClient, formatUnits, erc20Abi } from "viem";
import type { Address, Token, NativeBalance, TokenBalance, NativeCurrency } from "@aa-wallet/types";

export interface BalanceServiceConfig {
  client: PublicClient;
  nativeCurrency: NativeCurrency;
}

/**
 * Service for querying token balances
 */
export class BalanceService {
  private client: PublicClient;
  private nativeCurrency: NativeCurrency;

  constructor(config: BalanceServiceConfig) {
    this.client = config.client;
    this.nativeCurrency = config.nativeCurrency;
  }

  /**
   * Get native token balance (ETH, etc.)
   */
  async getNativeBalance(address: Address): Promise<NativeBalance> {
    const balance = await this.client.getBalance({ address });

    return {
      balance: balance.toString(),
      formattedBalance: formatUnits(balance, this.nativeCurrency.decimals),
      symbol: this.nativeCurrency.symbol,
    };
  }

  /**
   * Get ERC-20 token balance
   */
  async getTokenBalance(address: Address, token: Token): Promise<TokenBalance> {
    const balance = await this.client.readContract({
      address: token.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });

    return {
      token,
      balance: balance.toString(),
      formattedBalance: formatUnits(balance, token.decimals),
    };
  }

  /**
   * Get multiple ERC-20 token balances in parallel
   */
  async getTokenBalances(address: Address, tokens: Token[]): Promise<TokenBalance[]> {
    const balancePromises = tokens.map((token) => this.getTokenBalance(address, token));
    return Promise.all(balancePromises);
  }

  /**
   * Fetch ERC-20 token metadata from contract
   */
  async getTokenMetadata(tokenAddress: Address, chainId: number): Promise<Token> {
    const [name, symbol, decimals] = await Promise.all([
      this.client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "name",
      }),
      this.client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      this.client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);

    return {
      address: tokenAddress,
      name,
      symbol,
      decimals,
      chainId,
    };
  }

  /**
   * Get all balances (native + tokens) for an address
   */
  async getAllBalances(
    address: Address,
    tokens: Token[]
  ): Promise<{ native: NativeBalance; tokens: TokenBalance[] }> {
    const [native, tokenBalances] = await Promise.all([
      this.getNativeBalance(address),
      this.getTokenBalances(address, tokens),
    ]);

    return { native, tokens: tokenBalances };
  }
}
