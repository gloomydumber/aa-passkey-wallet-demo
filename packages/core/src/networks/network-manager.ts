/**
 * Network Manager
 * Handles network switching and state management
 */

import type { Network, NetworkState } from "@aa-wallet/types";
import { supportedNetworks, defaultNetwork, getNetworkByChainId } from "./supported-networks";

export type NetworkChangeListener = (network: Network) => void;

export interface NetworkManagerConfig {
  initialNetwork?: Network;
  customNetworks?: Network[];
}

/**
 * Manages network state and switching
 */
export class NetworkManager {
  private state: NetworkState;
  private listeners: Set<NetworkChangeListener> = new Set();

  constructor(config: NetworkManagerConfig = {}) {
    const allNetworks = [...supportedNetworks, ...(config.customNetworks ?? [])];

    this.state = {
      activeNetwork: config.initialNetwork ?? defaultNetwork,
      networks: allNetworks,
    };
  }

  /**
   * Get current network state
   */
  getState(): NetworkState {
    return { ...this.state };
  }

  /**
   * Get the currently active network
   */
  getActiveNetwork(): Network {
    return this.state.activeNetwork;
  }

  /**
   * Get all available networks
   */
  getNetworks(): Network[] {
    return [...this.state.networks];
  }

  /**
   * Switch to a different network by chain ID
   * @throws Error if network is not found
   */
  switchNetwork(chainId: number): Network {
    const network = this.state.networks.find((n) => n.chainId === chainId);
    if (!network) {
      throw new Error(`Network with chainId ${chainId} not found`);
    }

    if (this.state.activeNetwork.chainId !== chainId) {
      this.state.activeNetwork = network;
      this.notifyListeners(network);
    }

    return network;
  }

  /**
   * Add a custom network
   */
  addNetwork(network: Network): void {
    const exists = this.state.networks.some((n) => n.chainId === network.chainId);
    if (exists) {
      throw new Error(`Network with chainId ${network.chainId} already exists`);
    }
    this.state.networks.push(network);
  }

  /**
   * Update network URLs (rpcUrl, bundlerUrl, paymasterUrl, explorerUrl)
   */
  updateNetworkUrls(
    chainId: number,
    urls: {
      rpcUrl?: string;
      bundlerUrl?: string;
      paymasterUrl?: string;
      explorerUrl?: string;
    }
  ): Network {
    const existing = this.state.networks.find((n) => n.chainId === chainId);
    if (!existing) {
      throw new Error(`Network with chainId ${chainId} not found`);
    }

    const updatedNetwork: Network = {
      chainId: existing.chainId,
      name: existing.name,
      displayName: existing.displayName,
      nativeCurrency: existing.nativeCurrency,
      isTestnet: existing.isTestnet,
      rpcUrl: urls.rpcUrl ?? existing.rpcUrl,
      bundlerUrl: urls.bundlerUrl ?? existing.bundlerUrl,
      explorerUrl: urls.explorerUrl ?? existing.explorerUrl,
      paymasterUrl: urls.paymasterUrl ?? existing.paymasterUrl,
    };

    const index = this.state.networks.findIndex((n) => n.chainId === chainId);
    this.state.networks[index] = updatedNetwork;

    if (this.state.activeNetwork.chainId === chainId) {
      this.state.activeNetwork = updatedNetwork;
      this.notifyListeners(updatedNetwork);
    }

    return updatedNetwork;
  }

  /**
   * Subscribe to network changes
   * @returns Unsubscribe function
   */
  onNetworkChange(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(network: Network): void {
    for (const listener of this.listeners) {
      listener(network);
    }
  }
}
