/**
 * Bundler Client Factory
 * Creates clients for EIP-4337 bundler interactions
 */

import { http, type PublicClient } from "viem";
import { createBundlerClient, createPaymasterClient, type SmartAccount } from "viem/account-abstraction";
import type { Network } from "@aa-wallet/types";

export interface BundlerClientConfig {
  network: Network;
  publicClient: PublicClient;
}

export interface BundlerClientOptions {
  /** Enable paymaster for sponsored transactions (testnet only) */
  sponsored?: boolean;
}

/**
 * Create a bundler client for the given network
 * Used for submitting UserOperations to the bundler
 */
export function createBundlerClientForNetwork<TSmartAccount extends SmartAccount | undefined = undefined>(
  config: BundlerClientConfig,
  account?: TSmartAccount,
  options?: BundlerClientOptions
) {
  const { network, publicClient } = config;
  const { sponsored = false } = options ?? {};

  // Create paymaster client if sponsored and paymaster URL is available
  const paymasterClient = sponsored && network.paymasterUrl
    ? createPaymasterClient({
        transport: http(network.paymasterUrl),
      })
    : undefined;

  return createBundlerClient({
    client: publicClient,
    transport: http(network.bundlerUrl),
    account,
    paymaster: paymasterClient,
  });
}
