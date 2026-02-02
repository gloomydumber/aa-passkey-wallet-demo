"use client";

/**
 * Account Activation Component
 *
 * Shows activation prompt when account is not deployed.
 * Allows deploying account with paymaster sponsorship on testnet.
 */

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import type { SmartAccount } from "viem/account-abstraction";
import type { SmartAccountInstance, Network } from "@aa-wallet/types";
import { createBundlerClient } from "@/lib/wallet-client";

type ActivationStatus = "idle" | "activating" | "success" | "error";

interface ActivationResult {
  userOpHash: `0x${string}`;
  txHash: `0x${string}`;
}

interface AccountActivationProps {
  account: SmartAccountInstance;
  network: Network;
  isPaymasterAvailable: boolean;
  onActivated: () => void;
  onSkip: () => void;
  onDismissSuccess?: () => void;
}

export function AccountActivation({
  account,
  network,
  isPaymasterAvailable,
  onActivated,
  onSkip,
  onDismissSuccess,
}: AccountActivationProps) {
  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActivationResult | null>(null);

  const handleActivate = useCallback(async () => {
    if (!isPaymasterAvailable) return;

    setStatus("activating");
    setError(null);

    try {
      const viemAccount = account.getViemAccount() as SmartAccount;
      const bundlerClient = createBundlerClient(network, viemAccount, { sponsored: true });

      // Send 0-value transaction to self to deploy the account
      const userOpHash = await bundlerClient.sendUserOperation({
        account: viemAccount,
        calls: [
          {
            to: account.address,
            value: BigInt(0),
            data: "0x" as `0x${string}`,
          },
        ],
      });

      // Wait for confirmation
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      setResult({
        userOpHash,
        txHash: receipt.receipt.transactionHash,
      });
      setStatus("success");

      // Notify parent immediately (parent controls when to dismiss)
      onActivated();
    } catch (err) {
      console.error("Activation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Activation failed";

      if (
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        errorMessage.includes("user rejected") ||
        errorMessage.includes("NotAllowedError")
      ) {
        setError("Cancelled by user");
      } else {
        setError(errorMessage);
      }
      setStatus("error");
    }
  }, [account, network, isPaymasterAvailable, onActivated]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  // Success state
  if (status === "success") {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-8 w-8 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="font-medium text-green-800 dark:text-green-200">
                Account Activated!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your smart account is now deployed on-chain.
              </p>
              <div className="mt-3 flex items-center gap-3">
                {result && (
                  <a
                    href={`${network.explorerUrl}/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                  >
                    View transaction
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {onDismissSuccess && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDismissSuccess}
                    className="text-green-700 hover:bg-green-100 hover:text-green-800 dark:text-green-400 dark:hover:bg-green-800/50 dark:hover:text-green-300"
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-8 w-8 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 dark:text-red-200">
                Activation Failed
              </h3>
              <p className="mb-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRetry}>
                  Try Again
                </Button>
                <Button size="sm" variant="ghost" onClick={onSkip}>
                  Skip for Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Activating state
  if (status === "activating") {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
        <CardContent className="flex items-center gap-4 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-200">
              Activating Account...
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Please sign with your passkey to deploy your account.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Idle state - show activation prompt
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
            <Rocket className="h-5 w-5 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-amber-800 dark:text-amber-200">
              Activate Your Account
            </h3>
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
              {isPaymasterAvailable
                ? "Deploy your smart account on-chain for free. This enables full wallet functionality."
                : "Your account will be deployed when you make your first transaction."}
            </p>
            {isPaymasterAvailable ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleActivate}>
                  Activate Free
                </Button>
                <Button size="sm" variant="ghost" onClick={onSkip}>
                  Skip for Now
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={onSkip}>
                Got it
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
