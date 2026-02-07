"use client";

/**
 * Wallet Layout
 *
 * Protected layout that requires authentication.
 * Redirects to login if user is not authenticated.
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/providers/wallet-provider";
import { useWalletStore, selectIsAuthenticated } from "@/stores/wallet-store";
import { Loader2 } from "lucide-react";

interface WalletLayoutProps {
  children: ReactNode;
}

export default function WalletLayout({ children }: WalletLayoutProps) {
  const router = useRouter();
  const { isReady } = useWallet();
  const isAuthenticated = useWalletStore(selectIsAuthenticated);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.push("/");
    }
  }, [isReady, isAuthenticated, router]);

  // Show loading while checking auth
  if (!isReady) {
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

  return <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">{children}</div>;
}
