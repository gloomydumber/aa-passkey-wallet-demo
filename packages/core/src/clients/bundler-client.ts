/**
 * Bundler Client Factory
 * Creates clients for EIP-4337 bundler interactions
 */

import { http, type PublicClient } from "viem";
import { createBundlerClient, type SmartAccount } from "viem/account-abstraction";
import { createPimlicoClient } from "permissionless/clients/pimlico";
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

  // For sponsored transactions, use Pimlico's paymaster client
  // This handles Pimlico's specific paymaster API (pm_sponsorUserOperation)
  const pimlicoClient = sponsored && network.paymasterUrl
    ? createPimlicoClient({
        transport: http(network.paymasterUrl),
        entryPoint: {
          address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as const, // EntryPoint v0.6
          version: "0.6" as const,
        },
      })
    : undefined;

  return createBundlerClient({
    client: publicClient,
    transport: http(network.bundlerUrl),
    account,
    paymaster: pimlicoClient,
  });
}
