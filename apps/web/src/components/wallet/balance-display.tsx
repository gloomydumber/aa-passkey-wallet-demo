"use client";

/**
 * Balance Display Component
 *
 * Displays the native token balance.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NativeBalance } from "@aa-wallet/types";

interface BalanceDisplayProps {
  balance: NativeBalance | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  networkName?: string;
}

export function BalanceDisplay({ balance, isLoading, onRefresh, networkName }: BalanceDisplayProps) {
  // NativeBalance already has formattedBalance pre-computed
  const displayBalance = balance
    ? `${balance.formattedBalance} ${balance.symbol}`
    : "0 ETH";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Balance
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>

        <div className="mt-2">
          {isLoading && !balance ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              <span className="text-zinc-400">Loading...</span>
            </div>
          ) : (
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {displayBalance}
            </div>
          )}
        </div>

        {balance && networkName && (
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {balance.symbol} on {networkName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
