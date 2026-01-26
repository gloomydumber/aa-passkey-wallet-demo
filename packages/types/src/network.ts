/**
 * Network types for AA Passkey Wallet
 */

export interface Network {
  /** Chain ID */
  chainId: number;
  /** Network name */
  name: string;
  /** Display name */
  displayName: string;
  /** RPC URL */
  rpcUrl: string;
  /** Bundler URL for EIP-4337 */
  bundlerUrl: string;
  /** Paymaster URL (optional) */
  paymasterUrl?: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** Native currency info */
  nativeCurrency: NativeCurrency;
  /** Whether this is a testnet */
  isTestnet: boolean;
}

export interface NativeCurrency {
  /** Currency name */
  name: string;
  /** Currency symbol */
  symbol: string;
  /** Decimal places */
  decimals: number;
}

export interface NetworkState {
  /** Currently selected network */
  activeNetwork: Network;
  /** List of available networks */
  networks: Network[];
}
