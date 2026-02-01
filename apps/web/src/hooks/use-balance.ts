"use client";

/**
 * useBalance Hook
 *
 * Fetches and manages native token balance.
 */

import { useState, useEffect, useCallback } from "react";
import { createBalanceService } from "@/lib/wallet-client";
import { useNetworkStore } from "@/stores/network-store";
import type { NativeBalance, Address } from "@aa-wallet/types";

interface UseBalanceOptions {
  address: Address | null;
  refetchInterval?: number; // in milliseconds
}

interface UseBalanceResult {
  balance: NativeBalance | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBalance({ address, refetchInterval = 30000 }: UseBalanceOptions): UseBalanceResult {
  const { activeNetwork } = useNetworkStore();
  const [balance, setBalance] = useState<NativeBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balanceService = createBalanceService(activeNetwork);
      const nativeBalance = await balanceService.getNativeBalance(address);
      setBalance(nativeBalance);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch balance"));
    } finally {
      setIsLoading(false);
    }
  }, [address, activeNetwork]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Set up periodic refetch
  useEffect(() => {
    if (!address || refetchInterval <= 0) return;

    const interval = setInterval(fetchBalance, refetchInterval);
    return () => clearInterval(interval);
  }, [address, refetchInterval, fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
