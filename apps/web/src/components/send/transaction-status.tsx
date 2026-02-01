"use client";

/**
 * Transaction Status Component
 *
 * Displays pending, success, or failed transaction states.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ExternalLink, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import type { TransactionResult, TransactionDetails } from "@/hooks/use-send-transaction";
import type { Network } from "@aa-wallet/types";

interface TransactionStatusProps {
  status: "pending" | "success" | "failed";
  result: TransactionResult | null;
  transaction: TransactionDetails | null;
  error: string | null;
  network: Network;
  symbol?: string;
  onDone: () => void;
  onRetry?: () => void;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function TransactionStatus({
  status,
  result,
  transaction,
  error,
  network,
  symbol = "ETH",
  onDone,
  onRetry,
}: TransactionStatusProps) {
  const explorerUrl = network.explorerUrl;

  return (
    <Card>
      <CardContent className="flex flex-col items-center py-8">
        {/* Status Icon */}
        <div className="mb-6">
          {status === "pending" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          )}
          {status === "success" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          )}
          {status === "failed" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          )}
        </div>

        {/* Status Title */}
        <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {status === "pending" && "Transaction Pending"}
          {status === "success" && "Transaction Successful"}
          {status === "failed" && "Transaction Failed"}
        </h2>

        {/* Status Description */}
        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {status === "pending" && "Your transaction is being processed..."}
          {status === "success" && transaction && (
            <>
              Successfully sent {transaction.amount} {symbol}
            </>
          )}
          {status === "failed" && (error || "An error occurred")}
        </p>

        {/* Transaction Details */}
        {result && (
          <div className="mb-6 w-full space-y-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
            {/* UserOp Hash */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                UserOp Hash
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-sm text-zinc-900 dark:text-zinc-50"
                  title={result.userOpHash}
                >
                  {truncateHash(result.userOpHash)}
                </span>
                <CopyButton text={result.userOpHash} />
              </div>
            </div>

            {/* Transaction Hash (when available) */}
            {result.txHash && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Transaction
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`${explorerUrl}/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {truncateHash(result.txHash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <CopyButton text={result.txHash} />
                </div>
              </div>
            )}

            {/* Block Number (when available) */}
            {result.blockNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Block</span>
                <span className="font-mono text-sm text-zinc-900 dark:text-zinc-50">
                  {result.blockNumber.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex w-full flex-col gap-3">
          {status === "success" && (
            <Button size="lg" className="w-full" onClick={onDone}>
              Done
            </Button>
          )}
          {status === "failed" && (
            <>
              {onRetry && (
                <Button size="lg" className="w-full" onClick={onRetry}>
                  Try Again
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={onDone}>
                Go Back
              </Button>
            </>
          )}
          {status === "pending" && (
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
              This may take a few moments...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
