"use client";

/**
 * Wallet Provider
 *
 * Initializes wallet services and manages authentication state.
 */

import { createContext, useContext, useEffect, useCallback, type ReactNode } from "react";
import { getPasskeyService, getNetworkManager, cleanupWalletClient } from "@/lib/wallet-client";
import { useWalletStore } from "@/stores/wallet-store";
import type { PasskeyServiceEvent } from "@aa-wallet/passkey";

interface WalletContextValue {
  isReady: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { isInitialized, setInitialized, setSession, setCredential, reset } = useWalletStore();

  // Handle passkey service events
  const handlePasskeyEvent = useCallback(
    (event: PasskeyServiceEvent) => {
      switch (event.type) {
        case "session_started":
          // Session started, update state
          getPasskeyService()
            .getSession()
            .then(setSession);
          getPasskeyService()
            .getCredential(event.credentialId)
            .then(setCredential);
          break;

        case "session_ended":
          // Session ended, clear state
          setSession(null);
          break;

        case "credential_registered":
          setCredential(event.credential);
          break;

        case "credential_removed":
          // Check if the removed credential was active
          const currentCredential = useWalletStore.getState().credential;
          if (currentCredential?.id === event.credentialId) {
            setCredential(null);
          }
          break;
      }
    },
    [setSession, setCredential]
  );

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const passkeyService = getPasskeyService();
        const _networkManager = getNetworkManager();

        // Add event listener
        const removeListener = passkeyService.addEventListener(handlePasskeyEvent);

        // Initialize passkey service (restores existing session if valid)
        const session = await passkeyService.initialize();

        if (!mounted) return;

        if (session) {
          setSession(session);
          // Load active credential
          const activeCredential = await passkeyService.getActiveCredential();
          if (activeCredential) {
            setCredential(activeCredential);
          }
        }

        setInitialized(true);

        // Cleanup on unmount
        return () => {
          removeListener();
        };
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
        if (mounted) {
          setInitialized(true); // Still mark as initialized so app can render
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [setInitialized, setSession, setCredential, handlePasskeyEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupWalletClient();
      reset();
    };
  }, [reset]);

  const value: WalletContextValue = {
    isReady: isInitialized,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
