/**
 * Wallet Store
 *
 * Manages wallet state: account, credentials, and session.
 */

import { create } from "zustand";
import type {
  SmartAccountInstance,
  PasskeyCredential,
  SessionState,
  Address,
} from "@aa-wallet/types";

interface WalletState {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  account: SmartAccountInstance | null;
  accountAddress: Address | null;
  credential: PasskeyCredential | null;
  session: SessionState | null;
  error: string | null;

  // Actions
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setAccount: (account: SmartAccountInstance | null, address?: Address | null) => void;
  setCredential: (credential: PasskeyCredential | null) => void;
  setSession: (session: SessionState | null) => void;
  setError: (error: string | null) => void;
  logout: () => void; // Clears session but keeps isInitialized
  reset: () => void; // Full reset (only for unmount)
}

const initialState = {
  isInitialized: false,
  isLoading: false,
  account: null,
  accountAddress: null,
  credential: null,
  session: null,
  error: null,
};

export const useWalletStore = create<WalletState>((set) => ({
  ...initialState,

  setInitialized: (initialized) => set({ isInitialized: initialized }),

  setLoading: (loading) => set({ isLoading: loading }),

  setAccount: (account, address) =>
    set({
      account,
      accountAddress: address ?? account?.address ?? null,
    }),

  setCredential: (credential) => set({ credential }),

  setSession: (session) => set({ session }),

  setError: (error) => set({ error }),

  logout: () =>
    set({
      account: null,
      accountAddress: null,
      session: null,
      error: null,
      // Keep isInitialized: true and credential (for re-login)
    }),

  reset: () => set(initialState),
}));

// Selectors for common derived state
export const selectIsAuthenticated = (state: WalletState) =>
  state.session?.isAuthenticated ?? false;

export const selectHasAccount = (state: WalletState) =>
  state.account !== null || state.accountAddress !== null;
