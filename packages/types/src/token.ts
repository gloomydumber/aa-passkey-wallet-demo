/**
 * Token types for AA Passkey Wallet
 */

export interface Token {
  /** Token contract address */
  address: `0x${string}`;
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Decimal places */
  decimals: number;
  /** Chain ID */
  chainId: number;
  /** Logo URL (optional) */
  logoUrl?: string;
}

export interface TokenBalance {
  /** Token info */
  token: Token;
  /** Raw balance (bigint as string for serialization) */
  balance: string;
  /** Formatted balance for display */
  formattedBalance: string;
}

export interface NativeBalance {
  /** Raw balance (bigint as string for serialization) */
  balance: string;
  /** Formatted balance for display */
  formattedBalance: string;
  /** Currency symbol */
  symbol: string;
}

export interface TokenState {
  /** Native token balance */
  nativeBalance: NativeBalance | null;
  /** ERC-20 token balances */
  tokenBalances: TokenBalance[];
  /** User's custom token list */
  customTokens: Token[];
  /** Loading state */
  isLoading: boolean;
}
