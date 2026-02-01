"use client";

/**
 * Send Page
 *
 * Full implementation of ETH transfer flow with UserOperations.
 * Includes activation options for accounts without funds.
 */

import { useRouter } from "next/navigation";
import { useCallback, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  SendForm,
  ConfirmSheet,
  TransactionStatus,
  ActivationOptions,
  type ActivationMethod,
} from "@/components/send";
import { ArrowLeft } from "lucide-react";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { useBalance, useSendTransaction } from "@/hooks";
import { isPaymasterAvailable } from "@/lib/wallet-client";
import type { Address } from "@aa-wallet/types";

export default function SendPage() {
  const router = useRouter();
  const { account, accountAddress } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

  // Activation state
  const [useSponsored, setUseSponsored] = useState(false);
  const [activationMethod, setActivationMethod] = useState<ActivationMethod | null>(null);

  // Fetch balance
  const { balance, isLoading: isBalanceLoading } = useBalance({
    address: accountAddress,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Transaction hook
  const {
    status,
    transaction,
    gasEstimate,
    result,
    error,
    isFirstTransaction,
    prepare,
    confirm,
    reset,
  } = useSendTransaction({
    account,
    network: activeNetwork,
    sponsored: useSponsored,
  });

  // Check if account needs activation
  // Account needs activation if balance is zero (or too low for gas)
  const needsActivation = useMemo(() => {
    if (isBalanceLoading) return false;
    if (!balance) return true;
    // Consider account needs activation if balance is less than 0.0001 ETH
    const balanceWei = BigInt(balance.balance);
    const minBalance = BigInt("100000000000000"); // 0.0001 ETH in wei
    return balanceWei < minBalance;
  }, [balance, isBalanceLoading]);

  // Check if paymaster is available for current network
  const paymasterAvailable = useMemo(() => {
    return isPaymasterAvailable(activeNetwork);
  }, [activeNetwork]);

  // Handle activation method selection
  const handleActivationSelect = useCallback((method: ActivationMethod) => {
    if (method === "paymaster") {
      setActivationMethod(method);
      setUseSponsored(true);
    }
    // Other methods (onramp, import) are coming soon - do nothing
  }, []);

  // Handle form submission (prepare transaction)
  const handleFormSubmit = useCallback(
    (to: Address, amount: string) => {
      prepare(to, amount);
    },
    [prepare]
  );

  // Handle confirm button click
  const handleConfirm = useCallback(() => {
    confirm();
  }, [confirm]);

  // Handle cancel confirmation
  const handleCancelConfirm = useCallback(() => {
    reset();
  }, [reset]);

  // Handle done/go back actions
  const handleDone = useCallback(() => {
    reset();
    setUseSponsored(false);
    setActivationMethod(null);
    router.push("/dashboard");
  }, [reset, router]);

  // Handle retry
  const handleRetry = useCallback(() => {
    // Reset and start fresh
    reset();
  }, [reset]);

  // Handle back from activation
  const handleBackFromActivation = useCallback(() => {
    setUseSponsored(false);
    setActivationMethod(null);
  }, []);

  // Show transaction status for pending/success/failed states
  if (status === "pending" || status === "success" || status === "failed") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <header className="mb-6 flex items-center gap-4">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {status === "pending" && "Processing..."}
            {status === "success" && "Sent!"}
            {status === "failed" && "Failed"}
          </h1>
        </header>

        <TransactionStatus
          status={status}
          result={result}
          transaction={transaction}
          error={error}
          network={activeNetwork}
          symbol={activeNetwork.nativeCurrency.symbol}
          onDone={handleDone}
          onRetry={status === "failed" ? handleRetry : undefined}
        />
      </div>
    );
  }

  // Show activation options if account needs activation and user hasn't selected a method
  if (needsActivation && !useSponsored) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <header className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Send</h1>
        </header>

        <ActivationOptions
          isPaymasterAvailable={paymasterAvailable}
          activeMethod={activationMethod}
          isActivating={false}
          onSelect={handleActivationSelect}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <header className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={needsActivation ? handleBackFromActivation : () => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Send</h1>
        {useSponsored && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Sponsored
          </span>
        )}
      </header>

      {/* Send Form */}
      <SendForm
        balance={balance}
        isLoading={status === "estimating" || isBalanceLoading}
        gasEstimate={gasEstimate}
        onSubmit={handleFormSubmit}
      />

      {/* Confirmation Sheet */}
      {status === "confirming" && transaction && gasEstimate && (
        <ConfirmSheet
          transaction={transaction}
          gasEstimate={gasEstimate}
          isFirstTransaction={isFirstTransaction}
          isSigning={false}
          symbol={activeNetwork.nativeCurrency.symbol}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}

      {/* Signing state */}
      {status === "signing" && transaction && gasEstimate && (
        <ConfirmSheet
          transaction={transaction}
          gasEstimate={gasEstimate}
          isFirstTransaction={isFirstTransaction}
          isSigning={true}
          symbol={activeNetwork.nativeCurrency.symbol}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}
    </div>
  );
}
