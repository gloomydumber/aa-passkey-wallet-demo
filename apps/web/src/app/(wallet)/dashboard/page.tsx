"use client";

/**
 * Dashboard Page
 *
 * Main wallet dashboard showing account, balance, and quick actions.
 * Shows activation prompt if account is not deployed.
 */

import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { AccountCard } from "@/components/wallet/account-card";
import { BalanceDisplay } from "@/components/wallet/balance-display";
import { NetworkSelector } from "@/components/wallet/network-selector";
import { AccountActivation } from "@/components/wallet/account-activation";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { useBalance, useAccountStatus } from "@/hooks";
import { getPasskeyService, isPaymasterAvailable } from "@/lib/wallet-client";
import { Send, History, Settings, LogOut } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { account, accountAddress, credential, logout } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

  // Track if user has dismissed the activation prompt
  const [activationDismissed, setActivationDismissed] = useState(false);
  // Track if activation just completed (to keep showing success UI)
  const [activationCompleted, setActivationCompleted] = useState(false);

  const { balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useBalance({
    address: accountAddress,
  });

  const {
    isDeployed,
    isLoading: isDeploymentLoading,
    refetch: refetchDeployment,
  } = useAccountStatus({
    address: accountAddress,
  });

  // Check if we should show activation prompt
  const showActivation = useMemo(() => {
    // Keep showing if activation just completed (to display success message)
    if (activationCompleted) return true;
    // Don't show while still checking
    if (isDeploymentLoading || isDeployed === null) return false;
    // Don't show if already deployed
    if (isDeployed) return false;
    // Don't show if user dismissed it
    if (activationDismissed) return false;
    return true;
  }, [isDeployed, isDeploymentLoading, activationDismissed, activationCompleted]);

  const paymasterAvailable = useMemo(() => {
    return isPaymasterAvailable(activeNetwork);
  }, [activeNetwork]);

  const handleActivated = useCallback(() => {
    // Mark activation as completed to keep showing success UI
    setActivationCompleted(true);
    // Refetch deployment status and balance
    refetchDeployment();
    refetchBalance();
  }, [refetchDeployment, refetchBalance]);

  const handleDismissSuccess = useCallback(() => {
    setActivationCompleted(false);
  }, []);

  const handleSkipActivation = useCallback(() => {
    setActivationDismissed(true);
  }, []);

  const handleShowActivation = useCallback(() => {
    setActivationDismissed(false);
  }, []);

  const handleLogout = async () => {
    try {
      await getPasskeyService().logout();
      logout();
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

      {/* Activation Prompt (if account not deployed) */}
      {showActivation && account && (
        <div className="mb-4">
          <AccountActivation
            account={account}
            network={activeNetwork}
            isPaymasterAvailable={paymasterAvailable}
            onActivated={handleActivated}
            onSkip={handleSkipActivation}
            onDismissSuccess={activationCompleted ? handleDismissSuccess : undefined}
          />
        </div>
      )}

      {/* Account Card */}
      {accountAddress && (
        <div className="mb-4">
          <AccountCard
            address={accountAddress}
            explorerUrl={activeNetwork.explorerUrl}
          />
          {/* Small indicator when activation dismissed but not deployed */}
          {activationDismissed && isDeployed === false && (
            <button
              onClick={handleShowActivation}
              className="mt-2 w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Account not deployed.{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-200">
                Deploy now
              </span>
            </button>
          )}
        </div>
      )}

      {/* Balance */}
      <div className="mb-6">
        <BalanceDisplay
          balance={balance}
          isLoading={isBalanceLoading}
          onRefresh={refetchBalance}
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
