"use client";

/**
 * Send Page
 *
 * ETH transfer flow with UserOperations.
 * Shows message if account has no balance.
 */

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SendForm, ConfirmSheet, TransactionStatus } from "@/components/send";
import { ArrowLeft, Wallet } from "lucide-react";
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
    refetchInterval: 15000,
  });

  // Transaction hook (no sponsorship - user pays gas)
  const {
    status,
    transaction,
    gasEstimate,
    preEstimatedGas,
    result,
    error,
    isFirstTransaction,
    prepare,
    confirm,
    reset,
    preEstimate,
  } = useSendTransaction({
    account,
    network: activeNetwork,
  });

  // Pre-estimate gas on mount for MAX button
  useEffect(() => {
    if (account && !preEstimatedGas) {
      preEstimate();
    }
  }, [account, preEstimatedGas, preEstimate]);

  // Check if account has sufficient balance
  const hasBalance = useMemo(() => {
    if (!balance) return false;
    const balanceWei = BigInt(balance.balance);
    const minBalance = BigInt("100000000000000"); // 0.0001 ETH
    return balanceWei >= minBalance;
  }, [balance]);

  // Handle form submission
  const handleFormSubmit = useCallback(
    (to: Address, amount: string) => {
      prepare(to, amount);
    },
    [prepare]
  );

  const handleConfirm = useCallback(() => {
    confirm();
  }, [confirm]);

  const handleCancelConfirm = useCallback(() => {
    reset();
  }, [reset]);

  const handleDone = useCallback(() => {
    reset();
    router.push("/dashboard");
  }, [reset, router]);

  const handleRetry = useCallback(() => {
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
          gasEstimate={gasEstimate}
          error={error}
          network={activeNetwork}
          symbol={activeNetwork.nativeCurrency.symbol}
          onDone={handleDone}
          onRetry={status === "failed" ? handleRetry : undefined}
        />
      </div>
    );
  }

  // Show loading while checking balance
  if (isBalanceLoading) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <header className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Send</h1>
        </header>

        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
        </div>
      </div>
    );
  }

  // Show "no balance" message if account has insufficient funds
  if (!hasBalance) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <header className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Send</h1>
        </header>

        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Wallet className="h-8 w-8 text-zinc-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              No Balance
            </h2>
            <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              You need {activeNetwork.nativeCurrency.symbol} to send transactions.
              <br />
              Share your address to receive funds first.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                View Address
              </Button>
            </div>
          </CardContent>
        </Card>
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

      <SendForm
        balance={balance}
        isLoading={status === "estimating"}
        gasEstimate={gasEstimate}
        preEstimatedGas={preEstimatedGas}
        chainId={activeNetwork.chainId}
        onSubmit={handleFormSubmit}
      />

      {status === "confirming" && transaction && gasEstimate && (
        <ConfirmSheet
          transaction={transaction}
          gasEstimate={gasEstimate}
          isFirstTransaction={isFirstTransaction}
          isSigning={false}
          symbol={activeNetwork.nativeCurrency.symbol}
          balanceWei={balance ? BigInt(balance.balance) : undefined}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}

      {status === "signing" && transaction && gasEstimate && (
        <ConfirmSheet
          transaction={transaction}
          gasEstimate={gasEstimate}
          isFirstTransaction={isFirstTransaction}
          isSigning={true}
          symbol={activeNetwork.nativeCurrency.symbol}
          balanceWei={balance ? BigInt(balance.balance) : undefined}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}
    </div>
  );
}
