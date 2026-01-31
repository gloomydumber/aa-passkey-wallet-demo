/**
 * Bundler Client Factory
 * Creates clients for EIP-4337 bundler interactions
 */

import { http, type PublicClient } from "viem";
import { createBundlerClient, type SmartAccount } from "viem/account-abstraction";
import type { Network } from "@aa-wallet/types";

export interface BundlerClientConfig {
  network: Network;
  publicClient: PublicClient;
}

/**
 * Create a bundler client for the given network
 * Used for submitting UserOperations to the bundler
 */
export function createBundlerClientForNetwork<TSmartAccount extends SmartAccount | undefined = undefined>(
  config: BundlerClientConfig,
  account?: TSmartAccount
) {
  const { network, publicClient } = config;

  return createBundlerClient({
    client: publicClient,
    transport: http(network.bundlerUrl),
    account,
  });
}
