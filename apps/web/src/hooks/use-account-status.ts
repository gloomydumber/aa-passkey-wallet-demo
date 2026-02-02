"use client";

/**
 * useAccountStatus Hook
 *
 * Checks if a smart account is deployed on-chain.
 */

import { useState, useEffect, useCallback } from "react";
import { createSmartAccountAdapter } from "@/lib/wallet-client";
import { useNetworkStore } from "@/stores/network-store";
import type { Address } from "@aa-wallet/types";

interface UseAccountStatusOptions {
  address: Address | null;
}

interface UseAccountStatusResult {
  isDeployed: boolean | null; // null = still checking
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccountStatus({ address }: UseAccountStatusOptions): UseAccountStatusResult {
  const { activeNetwork } = useNetworkStore();
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkDeployment = useCallback(async () => {
    if (!address) {
      setIsDeployed(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const adapter = createSmartAccountAdapter(activeNetwork);
      const deployed = await adapter.isDeployed(address);
      setIsDeployed(deployed);
    } catch (err) {
      console.error("Failed to check deployment status:", err);
      setError(err instanceof Error ? err : new Error("Failed to check deployment"));
      setIsDeployed(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, activeNetwork]);

  // Check on mount and when dependencies change
  useEffect(() => {
    checkDeployment();
  }, [checkDeployment]);

  return {
    isDeployed,
    isLoading,
    error,
    refetch: checkDeployment,
  };
}
