"use client";

/**
 * Account Card Component
 *
 * Displays the smart account address with copy functionality.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@aa-wallet/utils";
import { Copy, Check, ExternalLink } from "lucide-react";
import type { Address } from "@aa-wallet/types";

interface AccountCardProps {
  address: Address;
  explorerUrl?: string;
}

export function AccountCard({ address, explorerUrl }: AccountCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleOpenExplorer = () => {
    if (explorerUrl) {
      window.open(`${explorerUrl}/address/${address}`, "_blank");
    }
  };

  return (
    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white dark:from-zinc-800 dark:to-zinc-900">
      <CardContent className="p-6">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Smart Account
        </div>

        <div className="flex items-center justify-between">
          <div className="font-mono text-lg font-semibold">
            {shortenAddress(address, 6)}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-zinc-400 hover:bg-zinc-700 hover:text-white"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>

            {explorerUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenExplorer}
                className="text-zinc-400 hover:bg-zinc-700 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Click the address to copy or view on explorer
        </div>
      </CardContent>
    </Card>
  );
}
