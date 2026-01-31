/**
 * Supported Networks Configuration
 *
 * Default network configurations for testnets.
 * Users should replace bundler/paymaster URLs with their own API keys.
 */

import type { Network } from "@aa-wallet/types";

/**
 * Sepolia Testnet Configuration
 * Chain ID: 11155111
 */
export const sepoliaNetwork: Network = {
  chainId: 11155111,
  name: "sepolia",
  displayName: "Sepolia",
  rpcUrl: "https://rpc.sepolia.org",
  bundlerUrl: "https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_API_KEY",
  paymasterUrl: "https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_API_KEY",
  explorerUrl: "https://sepolia.etherscan.io",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  isTestnet: true,
};

/**
 * Arbitrum Sepolia Testnet Configuration
 * Chain ID: 421614
 */
export const arbitrumSepoliaNetwork: Network = {
  chainId: 421614,
  name: "arbitrum-sepolia",
  displayName: "Arbitrum Sepolia",
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  bundlerUrl: "https://api.pimlico.io/v2/arbitrum-sepolia/rpc?apikey=YOUR_API_KEY",
  paymasterUrl: "https://api.pimlico.io/v2/arbitrum-sepolia/rpc?apikey=YOUR_API_KEY",
  explorerUrl: "https://sepolia.arbiscan.io",
  nativeCurrency: {
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  isTestnet: true,
};

/**
 * Default supported networks
 */
export const supportedNetworks: Network[] = [sepoliaNetwork, arbitrumSepoliaNetwork];

/**
 * Default network (Sepolia)
 */
export const defaultNetwork: Network = sepoliaNetwork;

/**
 * Get network by chain ID
 */
export function getNetworkByChainId(chainId: number): Network | undefined {
  return supportedNetworks.find((n) => n.chainId === chainId);
}

/**
 * Get network by name
 */
export function getNetworkByName(name: string): Network | undefined {
  return supportedNetworks.find((n) => n.name === name);
}
