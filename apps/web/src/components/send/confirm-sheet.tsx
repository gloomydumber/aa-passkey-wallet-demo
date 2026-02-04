"use client";

/**
 * Confirm Sheet Component
 *
 * Bottom sheet/modal showing transaction details for confirmation before signing.
 */

import { formatEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, AlertTriangle, X, Info } from "lucide-react";
import type { TransactionDetails, GasEstimate } from "@/hooks/use-send-transaction";

/**
 * Simple tooltip component using CSS
 */
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <span className="group relative inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
        {content}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700" />
      </span>
    </span>
  );
}

interface ConfirmSheetProps {
  transaction: TransactionDetails;
  gasEstimate: GasEstimate;
  isFirstTransaction: boolean;
  isSigning: boolean;
  symbol?: string;
  balanceWei?: bigint;
  onConfirm: () => void;
  onCancel: () => void;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatGas(value: bigint): string {
  const eth = parseFloat(formatEther(value));
  // Show more precision for small values
  if (eth < 0.0001) {
    return eth.toExponential(2);
  }
  return eth.toFixed(6).replace(/\.?0+$/, "");
}

export function ConfirmSheet({
  transaction,
  gasEstimate,
  isFirstTransaction,
  isSigning,
  symbol = "ETH",
  balanceWei,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const totalRequired = transaction.value + gasEstimate.totalGasCost;
  const hasInsufficientBalance = balanceWei !== undefined && totalRequired > balanceWei;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={onCancel}
            disabled={isSigning}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-center">Confirm Transaction</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Amount Section */}
          <div className="text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Sending</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {transaction.amount} {symbol}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
            {/* To Address */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">To</span>
              <span
                className="font-mono text-sm text-zinc-900 dark:text-zinc-50"
                title={transaction.to}
              >
                {truncateAddress(transaction.to)}
              </span>
            </div>

            {/* Gas Estimate */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                Max Gas Fee
                <Tooltip content="This is the maximum gas fee. Actual cost is typically 2-3x lower. Bundlers (like Pimlico) use conservative gas limits to ensure transactions succeed. The unused gas is not charged.">
                  <Info className="h-3.5 w-3.5 cursor-help text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                </Tooltip>
              </span>
              <span className="text-sm text-zinc-900 dark:text-zinc-50">
                {formatGas(gasEstimate.totalGasCost)} {symbol}
              </span>
            </div>

            {/* Total */}
            <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Total
                </span>
                <span className={`font-medium ${hasInsufficientBalance ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"}`}>
                  {formatGas(totalRequired)} {symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-500" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Insufficient Balance
                </p>
                <p className="text-red-700 dark:text-red-300/80">
                  Total cost exceeds your balance. Reduce the amount or add more funds.
                </p>
              </div>
            </div>
          )}

          {/* First Transaction Warning */}
          {isFirstTransaction && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-500" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  First Transaction
                </p>
                <p className="text-amber-700 dark:text-amber-300/80">
                  This will deploy your smart account. Gas costs include deployment fees.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full"
            onClick={onConfirm}
            disabled={isSigning || hasInsufficientBalance}
            isLoading={isSigning}
          >
            <Fingerprint className="h-5 w-5" />
            {isSigning ? "Signing..." : "Sign with Passkey"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={onCancel}
            disabled={isSigning}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
