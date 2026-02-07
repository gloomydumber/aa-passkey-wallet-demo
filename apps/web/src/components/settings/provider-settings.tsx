"use client";

/**
 * Provider Settings Component
 *
 * Displays current network and provider configuration (read-only for now).
 */

import { Card, CardContent } from "@/components/ui/card";
import { useNetworkStore } from "@/stores/network-store";
import { Globe, Truck, Wallet, CreditCard, Wrench } from "lucide-react";

interface ProviderRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function ProviderRow({ icon, label, value }: ProviderRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{value}</span>
    </div>
  );
}

export function ProviderSettings() {
  const { activeNetwork } = useNetworkStore();

  return (
    <Card>
      <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <ProviderRow
          icon={<Globe className="h-4 w-4" />}
          label="Network"
          value={activeNetwork.displayName}
        />
        <ProviderRow icon={<Truck className="h-4 w-4" />} label="Bundler" value="Pimlico" />
        <ProviderRow
          icon={<CreditCard className="h-4 w-4" />}
          label="Paymaster"
          value={activeNetwork.isTestnet ? "Pimlico (testnet)" : "Not available"}
        />
        <ProviderRow
          icon={<Wallet className="h-4 w-4" />}
          label="Smart Account"
          value="Coinbase Smart Wallet"
        />

        <div className="flex items-center gap-2 pt-4 text-xs text-zinc-500 dark:text-zinc-400">
          <Wrench className="h-3.5 w-3.5" />
          <span>Custom configuration coming soon</span>
        </div>
      </CardContent>
    </Card>
  );
}
