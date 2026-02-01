/**
 * Network Store
 *
 * Manages network state: active network, available networks.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Network } from "@aa-wallet/types";
import { getConfiguredNetworks, getDefaultNetwork } from "@/lib/wallet-client";

interface NetworkState {
  // State
  activeNetwork: Network;
  networks: Network[];

  // Actions
  switchNetwork: (chainId: number) => void;
  setActiveNetwork: (network: Network) => void;
}

// Initialize with configured networks (includes env var overrides)
const configuredNetworks = getConfiguredNetworks();
const configuredDefaultNetwork = getDefaultNetwork();

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      activeNetwork: configuredDefaultNetwork,
      networks: configuredNetworks,

      switchNetwork: (chainId) => {
        const network = get().networks.find((n) => n.chainId === chainId);
        if (network) {
          set({ activeNetwork: network });
        }
      },

      setActiveNetwork: (network) => set({ activeNetwork: network }),
    }),
    {
      name: "aa-wallet:network",
      partialize: (state) => ({
        // Only persist the active network chain ID
        activeChainId: state.activeNetwork.chainId,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as { activeChainId?: number } | undefined;
        if (persistedState?.activeChainId) {
          const network = current.networks.find(
            (n) => n.chainId === persistedState.activeChainId
          );
          if (network) {
            return { ...current, activeNetwork: network };
          }
        }
        return current;
      },
    }
  )
);

// Selectors
export const selectChainId = (state: NetworkState) => state.activeNetwork.chainId;
export const selectNetworkName = (state: NetworkState) => state.activeNetwork.displayName;
export const selectIsTestnet = (state: NetworkState) => state.activeNetwork.isTestnet;
