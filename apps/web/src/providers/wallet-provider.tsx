"use client";

/**
 * Wallet Provider
 *
 * Initializes wallet services and manages authentication state.
 */

import { createContext, useContext, useEffect, useCallback, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getPasskeyService,
  getNetworkManager,
  cleanupWalletClient,
  createSmartAccountAdapter,
} from "@/lib/wallet-client";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import type { PasskeyServiceEvent } from "@aa-wallet/passkey";

interface WalletContextValue {
  isReady: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { isInitialized, setInitialized, setSession, setCredential, setAccount, logout, reset } =
    useWalletStore();
  const { activeNetwork } = useNetworkStore();
  const pathname = usePathname();
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());

  // Record activity to reset inactivity timer
  const recordActivity = useCallback(() => {
    // Throttle to avoid excessive calls (max once per second)
    const now = Date.now();
    if (now - lastActivityRef.current < 1000) return;
    lastActivityRef.current = now;

    getPasskeyService()
      .recordActivity()
      .catch((err) => {
        console.error("Failed to record activity:", err);
      });
  }, []);

  // Record activity on route changes
  useEffect(() => {
    if (isInitialized) {
      recordActivity();
    }
  }, [pathname, isInitialized, recordActivity]);

  // Record activity on user interactions (clicks, keypresses, touch, focus)
  useEffect(() => {
    if (!isInitialized) return;

    const events = ["click", "keydown", "touchstart", "scroll"];

    events.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    // Handle tab visibility change - when user returns to tab, record activity
    // and check if session should still be valid
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // User returned to tab - check session validity
        const passkeyService = getPasskeyService();
        const session = await passkeyService.getSession();
        if (session) {
          // Session still valid, record activity
          recordActivity();
        }
        // If session is null, the getSession() call already triggered session_ended
      }
    };

    // Handle window focus - similar to visibility change
    const handleFocus = () => {
      recordActivity();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isInitialized, recordActivity]);

  // Handle passkey service events
  const handlePasskeyEvent = useCallback(
    (event: PasskeyServiceEvent) => {
      switch (event.type) {
        case "session_started":
          // Session started, update state
          getPasskeyService().getSession().then(setSession);
          getPasskeyService().getCredential(event.credentialId).then(setCredential);
          break;

        case "session_ended":
          // Session ended, clear all auth state and redirect to login
          console.log("Session ended, reason:", event.reason);
          logout();
          // Clear any session-scoped flags
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("activation_skipped");
          }
          // Redirect to login page
          router.push("/");
          break;

        case "credential_registered":
          setCredential(event.credential);
          break;

        case "credential_removed": {
          // Check if the removed credential was active
          const currentCredential = useWalletStore.getState().credential;
          if (currentCredential?.id === event.credentialId) {
            setCredential(null);
          }
          break;
        }
      }
    },
    [setSession, setCredential, logout, router]
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

            // Restore smart account from credential
            try {
              const adapter = createSmartAccountAdapter(activeNetwork);
              const smartAccount = await adapter.createAccount({
                owner: {
                  id: activeCredential.id,
                  publicKey: activeCredential.publicKey as `0x${string}`,
                },
              });
              setAccount(smartAccount, smartAccount.address);
            } catch (err) {
              console.error("Failed to restore smart account:", err);
            }
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

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
