"use client";

/**
 * Activate Page
 *
 * Shows activation options after login if account is not deployed.
 * - Testnet: Free Activation, On-Ramp, Import Wallet
 * - Mainnet: On-Ramp, Import Wallet (no free activation)
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { useAccountStatus } from "@/hooks";
import { isPaymasterAvailable, createBundlerClient } from "@/lib/wallet-client";
import {
  Rocket,
  CreditCard,
  KeyRound,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import type { SmartAccount } from "viem/account-abstraction";

type ActivationMethod = "free" | "onramp" | "import" | null;
type ActivationStatus = "idle" | "activating" | "success" | "error";

interface ActivationResult {
  txHash: `0x${string}`;
}

export default function ActivatePage() {
  const router = useRouter();
  const { account, accountAddress } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

  const [selectedMethod, setSelectedMethod] = useState<ActivationMethod>(null);
  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActivationResult | null>(null);

  const { isDeployed, isLoading: isCheckingDeployment } = useAccountStatus({
    address: accountAddress,
  });

  const paymasterAvailable = isPaymasterAvailable(activeNetwork);

  // All useCallback hooks must be defined before any conditional returns
  const handleFreeActivation = useCallback(async () => {
    if (!account || !paymasterAvailable) return;

    setSelectedMethod("free");
    setStatus("activating");
    setError(null);

    try {
      const viemAccount = account.getViemAccount() as SmartAccount;
      const bundlerClient = createBundlerClient(activeNetwork, viemAccount, { sponsored: true });

      // Send 0-value transaction to self to deploy the account
      const userOpHash = await bundlerClient.sendUserOperation({
        account: viemAccount,
        calls: [
          {
            to: accountAddress!,
            value: BigInt(0),
            data: "0x" as `0x${string}`,
          },
        ],
      });

      // Wait for confirmation
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      setResult({ txHash: receipt.receipt.transactionHash });
      setStatus("success");
    } catch (err) {
      console.error("Free activation failed:", err);
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
  }, [account, accountAddress, activeNetwork, paymasterAvailable]);

  const handleOnRamp = useCallback(() => {
    setSelectedMethod("onramp");
    // TODO: Implement on-ramp integration (MoonPay, Transak, etc.)
  }, []);

  const handleImportWallet = useCallback(() => {
    setSelectedMethod("import");
    // TODO: Implement import wallet modal
  }, []);

  const handleSkip = useCallback(() => {
    sessionStorage.setItem("activation_skipped", "true");
    router.push("/dashboard");
  }, [router]);

  const handleContinue = useCallback(() => {
    // Set skip flag so layout won't redirect back to activate
    sessionStorage.setItem("activation_skipped", "true");
    router.push("/dashboard");
  }, [router]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setError(null);
    setSelectedMethod(null);
  }, []);

  // Note: We don't redirect here if already deployed.
  // The layout handles redirecting away from /activate when deployed.
  // If user manually navigates here after deployment, they just see the options.

  // Loading state while checking deployment
  if (isCheckingDeployment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Checking account status...</p>
        </div>
      </div>
    );
  }

  // Already deployed - show message instead of activation options
  if (isDeployed === true && status !== "success") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Account Already Active
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Your smart account is already deployed on-chain.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleContinue}
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Account Activated!
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Your smart account is now deployed on-chain.
          </p>
        </div>

        {result && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
            <CardContent className="py-4">
              <a
                href={`${activeNetwork.explorerUrl}/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
              >
                View transaction on {activeNetwork.displayName}
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleContinue}
        >
          Continue to Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Activation Failed
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{error}</p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={handleSkip}>
            Skip for Now
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Activating state
  if (status === "activating") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Activating Account...
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Please sign with your passkey to deploy your account.
          </p>
        </div>
      </div>
    );
  }

  // Main activation options (idle state)
  return (
    <div className="mx-auto max-w-lg p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Rocket className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {activeNetwork.isTestnet ? "Activate Your Account" : "Fund Your Account"}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {activeNetwork.isTestnet
            ? "Your smart account needs to be activated before you can start using the wallet."
            : "Add funds to start using your wallet."}
        </p>
      </div>

      {/* Activation Options */}
      <div className="space-y-3">
        {/* Option 1: Free Activation (Testnet Only) */}
        {activeNetwork.isTestnet && paymasterAvailable && (
          <Card
            className="cursor-pointer border-2 border-transparent transition-colors hover:border-green-500 dark:hover:border-green-600"
            onClick={handleFreeActivation}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Rocket className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  Free Activation
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Sponsored by the network - no cost to you
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-400" />
            </CardContent>
          </Card>
        )}

        {/* Option 2: On-Ramp (Buy ETH) */}
        <Card
          className="cursor-pointer border-2 border-transparent transition-colors hover:border-blue-500 dark:hover:border-blue-600"
          onClick={handleOnRamp}
        >
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Buy {activeNetwork.nativeCurrency.symbol}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Purchase with card via MoonPay
              </p>
              <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Coming Soon
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-zinc-400" />
          </CardContent>
        </Card>

        {/* Option 3: Import from Existing Wallet */}
        <Card
          className="cursor-pointer border-2 border-transparent transition-colors hover:border-purple-500 dark:hover:border-purple-600"
          onClick={handleImportWallet}
        >
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <KeyRound className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Import from Existing Wallet
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Transfer balance from another wallet
              </p>
              <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Coming Soon
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-zinc-400" />
          </CardContent>
        </Card>
      </div>

      {/* Skip Button */}
      <div className="mt-8 text-center">
        <Button variant="ghost" onClick={handleSkip} className="text-zinc-500">
          Skip for Now
        </Button>
      </div>

      {/* Network Notice */}
      {activeNetwork.isTestnet && (
        <div className="mt-6 rounded-lg bg-zinc-100 p-3 text-center text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          You are on {activeNetwork.displayName} (Testnet)
        </div>
      )}
    </div>
  );
}
