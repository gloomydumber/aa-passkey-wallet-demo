/**
 * Activity Store
 *
 * Manages transaction history per chain, persisted to localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Transaction } from "@aa-wallet/types";

const MAX_TRANSACTIONS_PER_CHAIN = 50;

interface ActivityState {
  // State: chainId -> Transaction[]
  transactions: Record<number, Transaction[]>;

  // Actions
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (
    chainId: number,
    userOpHash: `0x${string}`,
    update: Partial<Transaction>
  ) => void;
  getTransactions: (chainId: number) => Transaction[];
  clearHistory: (chainId: number) => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      transactions: {},

      addTransaction: (tx) =>
        set((state) => {
          const chainTxs = state.transactions[tx.chainId] ?? [];
          const updated = [tx, ...chainTxs].slice(0, MAX_TRANSACTIONS_PER_CHAIN);
          return {
            transactions: {
              ...state.transactions,
              [tx.chainId]: updated,
            },
          };
        }),

      updateTransaction: (chainId, userOpHash, update) =>
        set((state) => {
          const chainTxs = state.transactions[chainId];
          if (!chainTxs) return state;

          const updated = chainTxs.map((tx) =>
            tx.userOpHash === userOpHash ? { ...tx, ...update } : tx
          );
          return {
            transactions: {
              ...state.transactions,
              [chainId]: updated,
            },
          };
        }),

      getTransactions: (chainId) => get().transactions[chainId] ?? [],

      clearHistory: (chainId) =>
        set((state) => {
          const { [chainId]: _, ...rest } = state.transactions;
          return { transactions: rest };
        }),
    }),
    {
      name: "aa-wallet:activity",
    }
  )
);
