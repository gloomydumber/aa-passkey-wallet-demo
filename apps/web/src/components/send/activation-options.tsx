"use client";

/**
 * Activation Options Component
 *
 * Shows options for activating a smart account when it has no funds.
 * Options: Free Activation (paymaster), Buy ETH (on-ramp), Import Wallet
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, CreditCard, KeyRound, Loader2 } from "lucide-react";

export type ActivationMethod = "paymaster" | "onramp" | "import";

interface ActivationOptionsProps {
  /** Whether paymaster is available (testnet only) */
  isPaymasterAvailable: boolean;
  /** Currently selected/active method */
  activeMethod: ActivationMethod | null;
  /** Whether activation is in progress */
  isActivating: boolean;
  /** Callback when user selects an activation method */
  onSelect: (method: ActivationMethod) => void;
}

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  disabled?: boolean;
  comingSoon?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

function OptionCard({
  icon,
  title,
  description,
  buttonText,
  disabled,
  comingSoon,
  isLoading,
  onClick,
}: OptionCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        disabled || comingSoon
          ? "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
            disabled || comingSoon
              ? "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{title}</h3>
            {comingSoon && (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                Coming Soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          <Button
            size="sm"
            variant={comingSoon ? "outline" : "primary"}
            className="mt-3"
            disabled={disabled || comingSoon || isLoading}
            onClick={onClick}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              buttonText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ActivationOptions({
  isPaymasterAvailable,
  activeMethod,
  isActivating,
  onSelect,
}: ActivationOptionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Activation Required</CardTitle>
        <CardDescription>
          Your smart account needs to be activated before you can send transactions.
          Choose an option below to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Option 1: Free Activation (Paymaster) - Testnet Only */}
        <OptionCard
          icon={<Gift className="h-5 w-5" />}
          title="Free Activation"
          description={
            isPaymasterAvailable
              ? "First transaction sponsored by the network. Available on testnet only."
              : "Not available on this network. Switch to a testnet to use free activation."
          }
          buttonText="Activate Free"
          disabled={!isPaymasterAvailable || (isActivating && activeMethod !== "paymaster")}
          isLoading={isActivating && activeMethod === "paymaster"}
          onClick={() => onSelect("paymaster")}
        />

        {/* Option 2: Buy ETH (On-Ramp) - Coming Soon */}
        <OptionCard
          icon={<CreditCard className="h-5 w-5" />}
          title="Buy ETH"
          description="Purchase ETH with a card. Includes activation cost."
          buttonText="Buy with Card"
          comingSoon
          onClick={() => onSelect("onramp")}
        />

        {/* Option 3: Import Existing Wallet - Coming Soon */}
        <OptionCard
          icon={<KeyRound className="h-5 w-5" />}
          title="Import Existing Wallet"
          description="Use a private key or seed phrase to fund your account."
          buttonText="Import Wallet"
          comingSoon
          onClick={() => onSelect("import")}
        />
      </CardContent>
    </Card>
  );
}
