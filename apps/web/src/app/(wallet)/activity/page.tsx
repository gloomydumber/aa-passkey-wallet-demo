"use client";

/**
 * Activity Page
 *
 * Displays transaction history for the current chain, sorted newest first.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { useActivityStore } from "@/stores/activity-store";
import { useNetworkStore } from "@/stores/network-store";
import { useWalletStore } from "@/stores/wallet-store";
import { TransactionItem } from "@/components/activity/transaction-item";
import type { Transaction } from "@aa-wallet/types";

const EMPTY_TXS: Transaction[] = [];

export default function ActivityPage() {
  const router = useRouter();
  const activeNetwork = useNetworkStore((s) => s.activeNetwork);
  const accountAddress = useWalletStore((s) => s.accountAddress);
  const transactions = useActivityStore((s) => s.transactions[activeNetwork.chainId] ?? EMPTY_TXS);
  const clearHistory = useActivityStore((s) => s.clearHistory);

  // Filter by current account and sort newest-first
  const sorted = useMemo(() => {
    if (!accountAddress) return [];
    const normalizedAddress = accountAddress.toLowerCase();
    return transactions
      .filter((tx) => tx.from.toLowerCase() === normalizedAddress)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, accountAddress]);

  return (
    <div className="mx-auto max-w-lg p-4">
      <header className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="flex-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">Activity</h1>
        {sorted.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearHistory(activeNetwork.chainId)}
            title="Clear history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </header>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <ArrowUpRight className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              No transactions yet
            </p>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Your transaction history on {activeNetwork.displayName} will appear here.
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push("/send")}>
              Send a transaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {sorted.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                explorerUrl={activeNetwork.explorerUrl}
                nativeSymbol={activeNetwork.nativeCurrency.symbol}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
