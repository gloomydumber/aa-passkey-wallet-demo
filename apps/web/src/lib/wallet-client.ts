/**
 * Wallet Client
 *
 * Integrates @aa-wallet/core and @aa-wallet/passkey packages.
 * Provides singleton instances and factory functions for wallet operations.
 */

import {
  NetworkManager,
  CoinbaseAccountAdapter,
  BalanceService,
  createPublicClientForNetwork,
  createBundlerClientForNetwork,
  sepoliaNetwork,
  arbitrumSepoliaNetwork,
} from "@aa-wallet/core";
import type { SmartAccount } from "viem/account-abstraction";
import { PasskeyService } from "@aa-wallet/passkey";
import type { Network, StoragePort } from "@aa-wallet/types";
import { getStorageAdapter } from "./storage-adapter";

// ============================================
// Environment-Based Network Configuration
// ============================================

/**
 * Get Pimlico API key from environment
 */
function getPimlicoApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
  if (!apiKey || apiKey === "your_pimlico_api_key_here") {
    console.warn(
      "Pimlico API key not configured. Set NEXT_PUBLIC_PIMLICO_API_KEY in .env.local"
    );
    return "";
  }
  return apiKey;
}

/**
 * Get configured network with environment variables applied
 */
function getConfiguredNetwork(baseNetwork: Network): Network {
  const pimlicoApiKey = getPimlicoApiKey();

  // Build URLs with API key
  const bundlerUrl = pimlicoApiKey
    ? `https://api.pimlico.io/v2/${baseNetwork.name}/rpc?apikey=${pimlicoApiKey}`
    : baseNetwork.bundlerUrl;

  const paymasterUrl = pimlicoApiKey
    ? `https://api.pimlico.io/v2/${baseNetwork.name}/rpc?apikey=${pimlicoApiKey}`
    : baseNetwork.paymasterUrl;

  // Get RPC URL from environment or use default
  let rpcUrl = baseNetwork.rpcUrl;
  if (baseNetwork.chainId === 11155111) {
    rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || baseNetwork.rpcUrl;
  } else if (baseNetwork.chainId === 421614) {
    rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || baseNetwork.rpcUrl;
  }

  return {
    ...baseNetwork,
    rpcUrl,
    bundlerUrl,
    paymasterUrl,
  };
}

/**
 * Get all configured networks
 */
function getConfiguredNetworks(): Network[] {
  return [
    getConfiguredNetwork(sepoliaNetwork),
    getConfiguredNetwork(arbitrumSepoliaNetwork),
  ];
}

/**
 * Get the default configured network
 */
function getDefaultNetwork(): Network {
  return getConfiguredNetwork(sepoliaNetwork);
}

// ============================================
// Singleton Instances
// ============================================

let networkManager: NetworkManager | null = null;
let passkeyService: PasskeyService | null = null;

/**
 * Get the NetworkManager singleton
 */
export function getNetworkManager(): NetworkManager {
  if (!networkManager) {
    const configuredNetworks = getConfiguredNetworks();
    networkManager = new NetworkManager({
      initialNetwork: configuredNetworks[0], // Sepolia
      customNetworks: configuredNetworks.slice(1), // Other networks
    });
  }
  return networkManager;
}

/**
 * Get the PasskeyService singleton
 *
 * @param storage - Optional custom storage adapter. Defaults to BrowserStorageAdapter.
 */
export function getPasskeyService(storage?: StoragePort): PasskeyService {
  if (!passkeyService) {
    passkeyService = new PasskeyService({
      storage: storage ?? getStorageAdapter(),
    });
  }
  return passkeyService;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a CoinbaseAccountAdapter for the given network
 */
export function createSmartAccountAdapter(network: Network): CoinbaseAccountAdapter {
  // Ensure we use the configured network with proper URLs
  const configuredNetwork = getConfiguredNetwork(network);
  const client = createPublicClientForNetwork({ network: configuredNetwork });
  return new CoinbaseAccountAdapter({ client });
}

/**
 * Create a BalanceService for the given network
 */
export function createBalanceService(network: Network): BalanceService {
  // Ensure we use the configured network with proper URLs
  const configuredNetwork = getConfiguredNetwork(network);
  const client = createPublicClientForNetwork({ network: configuredNetwork });
  return new BalanceService({
    client,
    nativeCurrency: configuredNetwork.nativeCurrency,
  });
}

/**
 * Create a bundler client for the given network and smart account
 * Used for submitting UserOperations
 */
export function createBundlerClient(network: Network, viemAccount: SmartAccount) {
  const configuredNetwork = getConfiguredNetwork(network);
  const publicClient = createPublicClientForNetwork({ network: configuredNetwork });
  return createBundlerClientForNetwork(
    { network: configuredNetwork, publicClient },
    viemAccount
  );
}

// ============================================
// Cleanup
// ============================================

/**
 * Cleanup all singleton instances.
 * Call this when the app unmounts or user logs out completely.
 */
export function cleanupWalletClient(): void {
  if (passkeyService) {
    passkeyService.destroy();
    passkeyService = null;
  }
  networkManager = null;
}

// ============================================
// Exports for stores
// ============================================

export { getConfiguredNetworks, getDefaultNetwork };
