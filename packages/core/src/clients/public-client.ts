/**
 * Public Client Factory
 * Creates viem public clients for blockchain interactions
 */

import { createPublicClient, http, type Chain, type PublicClient, type Transport } from "viem";
import type { Network } from "@aa-wallet/types";

export interface PublicClientConfig {
  network: Network;
}

/**
 * Create a public client for the given network
 * Used for reading blockchain state (balances, contract calls, etc.)
 */
export function createPublicClientForNetwork(
  config: PublicClientConfig
): PublicClient<Transport, Chain> {
  const { network } = config;

  const chain: Chain = {
    id: network.chainId,
    name: network.name,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: {
      default: { http: [network.rpcUrl] },
    },
    blockExplorers: {
      default: { name: "Explorer", url: network.explorerUrl },
    },
    testnet: network.isTestnet,
  };

  return createPublicClient({
    chain,
    transport: http(network.rpcUrl),
  });
}
