"use client";

/**
 * Transaction Item Component
 *
 * Displays a single transaction row in the activity list.
 */

import { ExternalLink, ArrowUpRight, Rocket, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { formatEther } from "viem";
import type { Transaction } from "@aa-wallet/types";

interface TransactionItemProps {
  transaction: Transaction;
  explorerUrl: string;
  nativeSymbol?: string;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

function formatAmount(value: string, decimals?: number, symbol?: string): string {
  if (!value || value === "0") return "";

  const formatted = decimals !== undefined
    ? (Number(value) / 10 ** decimals).toFixed(4).replace(/\.?0+$/, "")
    : parseFloat(formatEther(BigInt(value))).toFixed(6).replace(/\.?0+$/, "");

  const unit = symbol ?? "ETH";
  return `${formatted} ${unit}`;
}

function StatusIcon({ status }: { status: Transaction["status"] }) {
  switch (status) {
    case "pending":
    case "submitted":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function TypeIcon({ type }: { type: Transaction["type"] }) {
  switch (type) {
    case "account_deploy":
      return <Rocket className="h-4 w-4" />;
    default:
      return <ArrowUpRight className="h-4 w-4" />;
  }
}

function TypeLabel({ type }: { type: Transaction["type"] }) {
  switch (type) {
    case "transfer":
      return "Send";
    case "token_transfer":
      return "Token Send";
    case "account_deploy":
      return "Deploy";
    case "contract_call":
      return "Contract Call";
  }
}

export function TransactionItem({
  transaction: tx,
  explorerUrl,
  nativeSymbol = "ETH",
}: TransactionItemProps) {
  const explorerLink = tx.txHash
    ? `${explorerUrl}/tx/${tx.txHash}`
    : undefined;

  const symbol = tx.tokenSymbol ?? nativeSymbol;
  const amount = tx.type === "account_deploy"
    ? ""
    : formatAmount(tx.value, tx.tokenDecimals, symbol);

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      {/* Type Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        <TypeIcon type={tx.type} />
      </div>

      {/* Main Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            <TypeLabel type={tx.type} />
          </span>
          {tx.to && tx.type !== "account_deploy" && (
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
              to {truncateHash(tx.to)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{formatRelativeTime(tx.timestamp)}</span>
          {explorerLink && (
            <a
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Amount + Status */}
      <div className="flex shrink-0 items-center gap-2">
        {amount && (
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            -{amount}
          </span>
        )}
        <StatusIcon status={tx.status} />
      </div>
    </div>
  );
}
