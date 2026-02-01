"use client";

/**
 * Dashboard Page
 *
 * Main wallet dashboard showing account, balance, and quick actions.
 */

import { useRouter } from "next/navigation";
import { AccountCard } from "@/components/wallet/account-card";
import { BalanceDisplay } from "@/components/wallet/balance-display";
import { NetworkSelector } from "@/components/wallet/network-selector";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { useBalance } from "@/hooks/use-balance";
import { getPasskeyService } from "@/lib/wallet-client";
import { Send, History, Settings, LogOut } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { accountAddress, credential, logout } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

  const { balance, isLoading, refetch } = useBalance({
    address: accountAddress,
  });

  const handleLogout = async () => {
    try {
      await getPasskeyService().logout();
      logout(); // Clear session but keep isInitialized
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="mx-auto max-w-lg p-4">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {credential?.name || "My Wallet"}
        </h1>
        <NetworkSelector />
      </header>

      {/* Account Card */}
      {accountAddress && (
        <div className="mb-4">
          <AccountCard
            address={accountAddress}
            explorerUrl={activeNetwork.explorerUrl}
          />
        </div>
      )}

      {/* Balance */}
      <div className="mb-6">
        <BalanceDisplay
          balance={balance}
          isLoading={isLoading}
          onRefresh={refetch}
          networkName={activeNetwork.displayName}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="primary"
          size="lg"
          className="flex flex-col items-center gap-1 py-4"
          onClick={() => router.push("/send")}
        >
          <Send className="h-5 w-5" />
          <span>Send</span>
        </Button>

        <Button
          variant="secondary"
          size="lg"
          className="flex flex-col items-center gap-1 py-4"
          onClick={() => router.push("/activity")}
        >
          <History className="h-5 w-5" />
          <span>Activity</span>
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="mt-6 flex justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/settings")}
          className="text-zinc-500"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-zinc-500"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Testnet Notice */}
      {activeNetwork.isTestnet && (
        <div className="mt-8 rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          You are on {activeNetwork.displayName} (Testnet)
        </div>
      )}
    </div>
  );
}
