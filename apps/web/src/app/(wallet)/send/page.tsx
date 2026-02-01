"use client";

/**
 * Send Page
 *
 * Full implementation of ETH transfer flow with UserOperations.
 */

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SendForm, ConfirmSheet, TransactionStatus } from "@/components/send";
import { ArrowLeft } from "lucide-react";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { useBalance, useSendTransaction } from "@/hooks";
import type { Address } from "@aa-wallet/types";

export default function SendPage() {
  const router = useRouter();
  const { account, accountAddress } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

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
  });

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
    router.push("/dashboard");
  }, [reset, router]);

  // Handle retry
  const handleRetry = useCallback(() => {
    // Reset and start fresh
    reset();
  }, [reset]);

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

  return (
    <div className="mx-auto max-w-lg p-4">
      <header className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Send</h1>
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
