"use client";

/**
 * Wallet Layout
 *
 * Protected layout that requires authentication.
 * Redirects to login if user is not authenticated.
 * Redirects to activate if account is not deployed (except on activate page).
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWallet } from "@/providers/wallet-provider";
import { useWalletStore, selectIsAuthenticated } from "@/stores/wallet-store";
import { createSmartAccountAdapter } from "@/lib/wallet-client";
import { useNetworkStore } from "@/stores/network-store";
import { Loader2 } from "lucide-react";

interface WalletLayoutProps {
  children: ReactNode;
}

export default function WalletLayout({ children }: WalletLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady } = useWallet();
  const isAuthenticated = useWalletStore(selectIsAuthenticated);
  const accountAddress = useWalletStore((state) => state.accountAddress);
  const { activeNetwork } = useNetworkStore();

  const [isCheckingDeployment, setIsCheckingDeployment] = useState(true);
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null);
  const [hasSkippedActivation, setHasSkippedActivation] = useState(false);

  // Check if on activate page
  const isActivatePage = pathname === "/activate";

  // Check if user has skipped activation this session
  useEffect(() => {
    const skipped = sessionStorage.getItem("activation_skipped") === "true";
    setHasSkippedActivation(skipped);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.push("/");
    }
  }, [isReady, isAuthenticated, router]);

  // Check deployment status
  useEffect(() => {
    if (!isReady || !isAuthenticated || !accountAddress) {
      setIsCheckingDeployment(false);
      return;
    }

    async function checkDeployment() {
      try {
        const adapter = createSmartAccountAdapter(activeNetwork);
        const deployed = await adapter.isDeployed(accountAddress!);
        setIsDeployed(deployed);
      } catch (err) {
        console.error("Failed to check deployment:", err);
        // On error, assume deployed to avoid blocking user
        setIsDeployed(true);
      } finally {
        setIsCheckingDeployment(false);
      }
    }

    checkDeployment();
  }, [isReady, isAuthenticated, accountAddress, activeNetwork]);

  // Redirect to activate page if not deployed (and not already there, and not skipped)
  useEffect(() => {
    if (!isCheckingDeployment && isDeployed === false && !isActivatePage && !hasSkippedActivation) {
      router.replace("/activate");
    }
  }, [isCheckingDeployment, isDeployed, isActivatePage, hasSkippedActivation, router]);

  // Show loading while checking auth or deployment
  if (!isReady || (isAuthenticated && isCheckingDeployment)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Wait for redirect if not deployed and not on activate page (and not skipped)
  if (isDeployed === false && !isActivatePage && !hasSkippedActivation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {children}
    </div>
  );
}
