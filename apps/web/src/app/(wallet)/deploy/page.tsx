"use client";

/**
 * Deploy Page
 *
 * Provides deployment options for the smart account:
 * - Free Deployment (paymaster sponsored)
 * - Deploy with ETH (self-funded, uses account's native ETH balance)
 *
 * Self-funded deployment works because:
 * 1. Account is deployed via initCode in UserOp
 * 2. validateUserOp() sends missingAccountFunds to EntryPoint
 * 3. EntryPoint credits this to the account's deposit
 * 4. Gas is paid from this deposit
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { useBalance, useAccountStatus } from "@/hooks";
import { isPaymasterAvailable, createBundlerClient } from "@/lib/wallet-client";
import {
  Rocket,
  Coins,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Info,
  RefreshCw,
  Wallet,
  Sparkles,
  CircleDollarSign,
} from "lucide-react";
import type { SmartAccount } from "viem/account-abstraction";
import { formatEther } from "viem";
import { sepolia, arbitrumSepolia } from "viem/chains";
import { getRequiredPrefund } from "permissionless";

type DeployState = "idle" | "deploying" | "success" | "error";
type DeployView = "main" | "eth" | "erc20";

interface DeployResult {
  txHash: `0x${string}`;
}

export default function DeployPage() {
  const router = useRouter();
  const { account, accountAddress } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

  const [state, setState] = useState<DeployState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeployResult | null>(null);

  // SPA view state for sub-pages
  const [view, setView] = useState<DeployView>("main");

  // Separate gas estimates for each deployment method
  // Each deployment option uses its matching estimation method
  const [_sponsoredGasEstimate, setSponsoredGasEstimate] = useState<bigint | null>(null);
  const [selfFundedGasEstimate, setSelfFundedGasEstimate] = useState<bigint | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);

  // Store gas parameters for self-funded deployment
  const [selfFundedGasParams, setSelfFundedGasParams] = useState<{
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  } | null>(null);

  const {
    balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useBalance({
    address: accountAddress,
  });

  const { isDeployed, isLoading: isCheckingDeployment } = useAccountStatus({
    address: accountAddress,
  });

  const paymasterAvailable = isPaymasterAvailable(activeNetwork);

  // Truncate balance to reasonable precision for display
  const truncateBalance = (value: string, maxDecimals: number = 6): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num > 0 && num < 0.000001) return num.toExponential(2);
    return parseFloat(num.toFixed(maxDecimals)).toString();
  };

  // Format balance for display
  const formattedBalance = balance
    ? `${truncateBalance(balance.formattedBalance)} ${balance.symbol}`
    : `0 ${activeNetwork.nativeCurrency.symbol}`;

  // Check if user has a balance
  const balanceWei = balance ? BigInt(balance.balance) : BigInt(0);
  const hasBalance = balanceWei > BigInt(0);

  // Format gas estimates for display
  const formattedSelfFundedEstimate = selfFundedGasEstimate
    ? `${parseFloat(formatEther(selfFundedGasEstimate)).toFixed(6)} ${activeNetwork.nativeCurrency.symbol}`
    : null;

  // Check if user has enough balance for self-funded deployment
  // Uses self-funded estimation (non-sponsored) which matches actual deployment
  // Add 10% buffer for gas price fluctuations
  const requiredBalance = selfFundedGasEstimate
    ? (selfFundedGasEstimate * BigInt(110)) / BigInt(100)
    : BigInt(0);
  const hasEnoughForPaidDeploy =
    selfFundedGasEstimate !== null && !isEstimatingGas && balanceWei >= requiredBalance;

  // Format required balance (with buffer) for display
  const formattedRequiredBalance =
    requiredBalance > BigInt(0)
      ? `${parseFloat(formatEther(requiredBalance)).toFixed(6)} ${activeNetwork.nativeCurrency.symbol}`
      : null;

  // Get viem chain from network
  const getViemChain = useCallback(() => {
    if (activeNetwork.chainId === 11155111) return sepolia;
    if (activeNetwork.chainId === 421614) return arbitrumSepolia;
    return sepolia; // fallback
  }, [activeNetwork.chainId]);

  // Estimate gas for both deployment methods separately
  // - Sponsored estimation: for "Free Deployment" (always runs, works with 0 balance)
  // - Self-funded estimation: for "Deploy with ETH" (only runs if user has balance)
  const estimateGas = useCallback(async () => {
    if (!account || !accountAddress) return;

    setIsEstimatingGas(true);

    try {
      const viemAccount = account.getViemAccount() as SmartAccount;

      // Fetch gas price directly from Pimlico bundler (more accurate than RPC)
      // This uses pimlico_getUserOperationGasPrice which returns what bundler actually accepts
      type GasPriceResponse = {
        slow: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
        standard: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
        fast: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
      };

      const gasPriceResponse = await fetch(activeNetwork.bundlerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "pimlico_getUserOperationGasPrice",
          params: [],
        }),
      });
      const gasPriceResult = await gasPriceResponse.json();
      const gasPrices: GasPriceResponse = gasPriceResult.result;

      // Use "fast" tier with 10% buffer for reliability
      const bufferedMaxFeePerGas =
        (BigInt(gasPrices.fast.maxFeePerGas) * BigInt(110)) / BigInt(100);
      const maxPriorityFeePerGas =
        (BigInt(gasPrices.fast.maxPriorityFeePerGas) * BigInt(110)) / BigInt(100);

      // Helper to calculate requiredPrefund from gas estimate
      //
      // INVESTIGATION RESULT (2026-02-04):
      // Previously we assumed Pimlico required minimum verificationGasLimit of 800,000.
      // Testing proved this was INCORRECT - deployment succeeded with bundler's raw
      // estimate of 515,516 (actual gas used: 357,794).
      // The bundler's eth_estimateUserOperationGas is accurate and sufficient.

      const calculatePrefund = (estimate: {
        callGasLimit: bigint;
        verificationGasLimit: bigint;
        preVerificationGas: bigint;
      }) => {
        const userOpForPrefund = {
          sender: accountAddress,
          nonce: BigInt(0),
          callData: "0x" as `0x${string}`,
          callGasLimit: estimate.callGasLimit,
          verificationGasLimit: estimate.verificationGasLimit,
          preVerificationGas: estimate.preVerificationGas,
          maxFeePerGas: bufferedMaxFeePerGas,
          maxPriorityFeePerGas,
          signature: "0x" as `0x${string}`,
          paymasterAndData: "0x" as `0x${string}`,
        };

        return getRequiredPrefund({
          userOperation: userOpForPrefund,
          entryPointVersion: "0.6",
        });
      };

      // 1. SPONSORED estimation (for "Free Deployment")
      // Always runs - works even with 0 balance
      if (paymasterAvailable) {
        try {
          const sponsoredClient = createBundlerClient(activeNetwork, viemAccount, {
            sponsored: true,
          });
          const estimate = await sponsoredClient.estimateUserOperationGas({
            account: viemAccount,
            calls: [{ to: accountAddress, value: BigInt(0), data: "0x" as `0x${string}` }],
            maxFeePerGas: bufferedMaxFeePerGas,
            maxPriorityFeePerGas,
          });

          const requiredPrefund = calculatePrefund(estimate);
          console.log("Gas estimate (sponsored - for Free Deployment):", {
            preVerificationGas: estimate.preVerificationGas.toString(),
            verificationGasLimit: estimate.verificationGasLimit.toString(),
            callGasLimit: estimate.callGasLimit.toString(),
            maxFeePerGas: `${formatEther(bufferedMaxFeePerGas * BigInt(1e9))} gwei`,
            requiredPrefund: formatEther(requiredPrefund),
          });

          setSponsoredGasEstimate(requiredPrefund);
        } catch (sponsoredErr) {
          console.warn("Sponsored estimation failed:", sponsoredErr);
        }
      }

      // 2. SELF-FUNDED estimation (for "Deploy with ETH")
      // Always runs with stateOverride to make estimation independent of actual balance
      // This lets users see how much ETH they need regardless of current balance
      try {
        const nonSponsoredClient = createBundlerClient(activeNetwork, viemAccount, {
          sponsored: false,
        });

        // Always use stateOverride to simulate sufficient balance for estimation
        // This decouples gas estimation from actual balance - we want to know
        // "how much does deployment cost?" not "can this account afford it?"
        const stateOverride = [
          {
            address: accountAddress,
            balance: BigInt("1000000000000000000"), // Simulate 1 ETH
          },
        ];

        const estimate = await nonSponsoredClient.estimateUserOperationGas({
          account: viemAccount,
          calls: [{ to: accountAddress, value: BigInt(0), data: "0x" as `0x${string}` }],
          maxFeePerGas: bufferedMaxFeePerGas,
          maxPriorityFeePerGas,
          stateOverride,
        });

        const requiredPrefund = calculatePrefund(estimate);
        console.log("Gas estimate (self-funded):", {
          preVerificationGas: estimate.preVerificationGas.toString(),
          verificationGasLimit: estimate.verificationGasLimit.toString(),
          callGasLimit: estimate.callGasLimit.toString(),
          maxFeePerGas: bufferedMaxFeePerGas.toString() + " wei",
          requiredPrefund: formatEther(requiredPrefund) + " ETH",
        });

        // Store gas params for use in deployment
        setSelfFundedGasParams({
          callGasLimit: estimate.callGasLimit,
          verificationGasLimit: estimate.verificationGasLimit,
          preVerificationGas: estimate.preVerificationGas,
          maxFeePerGas: bufferedMaxFeePerGas,
          maxPriorityFeePerGas,
        });

        setSelfFundedGasEstimate(requiredPrefund);
      } catch (nonSponsoredErr) {
        console.warn("Self-funded estimation failed:", nonSponsoredErr);
      }

      setIsEstimatingGas(false);
    } catch (err) {
      console.error("Gas estimation error:", err);
      setIsEstimatingGas(false);
    }
  }, [account, accountAddress, activeNetwork, getViemChain, paymasterAvailable]);

  // Estimate gas on mount
  useEffect(() => {
    if (isDeployed === false && state === "idle") {
      estimateGas();
    }
  }, [isDeployed, state, estimateGas]);

  // Free deployment (sponsored)
  const handleFreeDeployment = useCallback(async () => {
    if (!account || !paymasterAvailable) return;

    setState("deploying");
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
      setState("success");
    } catch (err) {
      console.error("Free deployment failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Deployment failed";

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
      setState("error");
    }
  }, [account, accountAddress, activeNetwork, paymasterAvailable]);

  // Self-funded deployment (pay with account's ETH balance)
  const handlePaidDeployment = useCallback(async () => {
    if (!account || !accountAddress || !hasEnoughForPaidDeploy || !selfFundedGasParams) return;

    setState("deploying");
    setError(null);

    try {
      const viemAccount = account.getViemAccount() as SmartAccount;

      // Create bundler client WITHOUT paymaster - account will self-fund
      const bundlerClient = createBundlerClient(activeNetwork, viemAccount, { sponsored: false });

      // Fetch gas price directly from Pimlico bundler (more accurate than RPC)
      // This uses pimlico_getUserOperationGasPrice which returns what bundler actually accepts
      type GasPriceResponse = {
        slow: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
        standard: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
        fast: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
      };

      const gasPriceResponse = await fetch(activeNetwork.bundlerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "pimlico_getUserOperationGasPrice",
          params: [],
        }),
      });
      const gasPriceResult = await gasPriceResponse.json();
      const gasPrices: GasPriceResponse = gasPriceResult.result;

      // Use "fast" tier with 10% buffer for reliability
      const freshMaxFeePerGas = (BigInt(gasPrices.fast.maxFeePerGas) * BigInt(110)) / BigInt(100);
      const freshMaxPriorityFeePerGas =
        (BigInt(gasPrices.fast.maxPriorityFeePerGas) * BigInt(110)) / BigInt(100);

      // Calculate what the prefund should be with fresh gas price
      const totalGas =
        selfFundedGasParams.callGasLimit +
        selfFundedGasParams.verificationGasLimit +
        selfFundedGasParams.preVerificationGas;
      const calculatedPrefund = totalGas * freshMaxFeePerGas;

      console.log("Self-funded deployment:", {
        account: accountAddress,
        balance: formatEther(balanceWei) + " " + activeNetwork.nativeCurrency.symbol,
        gasParams: {
          callGasLimit: selfFundedGasParams.callGasLimit.toString(),
          verificationGasLimit: selfFundedGasParams.verificationGasLimit.toString(),
          preVerificationGas: selfFundedGasParams.preVerificationGas.toString(),
        },
        gasPrice: {
          maxFeePerGas: freshMaxFeePerGas.toString() + " wei",
          maxPriorityFeePerGas: freshMaxPriorityFeePerGas.toString() + " wei",
        },
        requiredPrefund: formatEther(calculatedPrefund) + " ETH",
      });

      // Send 0-value transaction to self - this triggers deployment
      // Use gas limits from estimation but FRESH gas price
      const userOpHash = await bundlerClient.sendUserOperation({
        account: viemAccount,
        calls: [
          {
            to: accountAddress,
            value: BigInt(0),
            data: "0x" as `0x${string}`,
          },
        ],
        // Gas limits from estimation (these are stable)
        callGasLimit: selfFundedGasParams.callGasLimit,
        verificationGasLimit: selfFundedGasParams.verificationGasLimit,
        preVerificationGas: selfFundedGasParams.preVerificationGas,
        // Fresh gas price (fetched just now)
        maxFeePerGas: freshMaxFeePerGas,
        maxPriorityFeePerGas: freshMaxPriorityFeePerGas,
      });

      console.log("UserOp hash:", userOpHash);

      // Wait for confirmation
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      console.log("Deployment success:", {
        txHash: receipt.receipt.transactionHash,
        actualGasUsed: receipt.actualGasUsed?.toString(),
      });

      setResult({ txHash: receipt.receipt.transactionHash });
      setState("success");
    } catch (err) {
      console.error("Self-funded deployment failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Deployment failed";

      if (
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        errorMessage.includes("user rejected") ||
        errorMessage.includes("NotAllowedError")
      ) {
        setError("Cancelled by user");
      } else if (errorMessage.includes("AA21")) {
        setError(
          "Account couldn't pay for gas. This may be a bundler limitation. Try Free Deployment instead."
        );
      } else {
        setError(errorMessage);
      }
      setState("error");
    }
  }, [
    account,
    accountAddress,
    activeNetwork,
    hasEnoughForPaidDeploy,
    balanceWei,
    selfFundedGasParams,
  ]);

  const handleRetry = useCallback(() => {
    setState("idle");
    setError(null);
    // Reset gas estimates so they get re-fetched
    setSponsoredGasEstimate(null);
    setSelfFundedGasEstimate(null);
    setSelfFundedGasParams(null);
  }, []);

  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleGoToFund = useCallback(() => {
    router.push("/fund");
  }, [router]);

  // Loading state
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

  // Already deployed
  if (isDeployed === true && state !== "success") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Account Already Deployed
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Your smart account is already deployed on-chain.
          </p>
        </div>

        <Button variant="primary" size="lg" className="w-full" onClick={handleGoToDashboard}>
          Go to Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Account Deployed!</h1>
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

        <Button variant="primary" size="lg" className="w-full" onClick={handleGoToDashboard}>
          Continue to Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Deployment Failed</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{error}</p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={handleGoToDashboard}>
            Go to Dashboard
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Deploying state
  if (state === "deploying") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Deploying Account...
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Please sign with your passkey to deploy your account.
          </p>
        </div>
      </div>
    );
  }

  // Main options (idle state)
  return (
    <div className="mx-auto max-w-lg p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Rocket className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {view === "main" && "Deploy Your Account"}
          {view === "eth" && "Pay with ETH"}
          {view === "erc20" && "Pay with ERC20"}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {view === "main" && "Deploy your smart account to start sending transactions."}
          {view === "eth" && "Choose how to pay for deployment with ETH."}
          {view === "erc20" && "Choose how to pay for deployment with ERC20 tokens."}
        </p>
      </div>

      {/* Balance Display */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Your Balance</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {isBalanceLoading ? "..." : formattedBalance}
              </span>
              <button
                onClick={() => refetchBalance()}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== MAIN VIEW ===== */}
      {view === "main" && (
        <>
          <div className="space-y-3">
            {/* Option 1: Free Deployment (Sponsored) */}
            {paymasterAvailable && (
              <Card
                className="cursor-pointer border-2 border-transparent transition-colors hover:border-green-500 dark:hover:border-green-600"
                onClick={handleFreeDeployment}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Rocket className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Free Deployment
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Sponsored by the network - no cost to you
                    </p>
                    {activeNetwork.isTestnet && (
                      <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Recommended
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Option 2: Pay with ETH */}
            <Card
              className="cursor-pointer border-2 border-transparent transition-colors hover:border-blue-500 dark:hover:border-blue-600"
              onClick={() => setView("eth")}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Coins className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    Pay with {activeNetwork.nativeCurrency.symbol}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Use native token to pay for deployment
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-zinc-400" />
              </CardContent>
            </Card>

            {/* Option 3: Pay with ERC20 (future feature) */}
            <Card
              className="cursor-pointer border-2 border-transparent transition-colors hover:border-orange-500 dark:hover:border-orange-600"
              onClick={() => setView("erc20")}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <CircleDollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Pay with ERC20
                    </h3>
                    <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Use USDC, USDT, or other tokens
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-zinc-400" />
              </CardContent>
            </Card>
          </div>

          {/* Tip when paymaster is available */}
          {paymasterAvailable && (
            <Card className="mt-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <p>
                      <strong>Tip:</strong> Free deployment is recommended on testnet.
                      {hasBalance &&
                        ` Your ${formattedBalance} will be available for transactions after deployment.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <div className="mt-8">
            <Button variant="ghost" className="w-full text-zinc-500" onClick={handleGoToDashboard}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </>
      )}

      {/* ===== ETH VIEW ===== */}
      {view === "eth" && (
        <>
          <div className="space-y-3">
            {/* Self-funded */}
            <Card
              className={`border-2 border-transparent transition-colors ${
                hasEnoughForPaidDeploy
                  ? "cursor-pointer hover:border-blue-500 dark:hover:border-blue-600"
                  : "cursor-not-allowed opacity-60"
              }`}
              onClick={hasEnoughForPaidDeploy ? handlePaidDeployment : undefined}
            >
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Self-funded</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Pay gas from your {activeNetwork.nativeCurrency.symbol} balance
                  </p>
                  {/* Cost display */}
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        Estimated
                        <span className="group relative">
                          <Info className="h-3.5 w-3.5 cursor-help text-zinc-400" />
                          <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-52 rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
                            Base gas cost calculated using EntryPoint&apos;s requiredPrefund
                            formula.
                          </span>
                        </span>
                      </span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {isEstimatingGas ? (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </span>
                        ) : (
                          (formattedSelfFundedEstimate ?? "--")
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        Required
                        <span className="group relative">
                          <Info className="h-3.5 w-3.5 cursor-help text-zinc-400" />
                          <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-48 rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
                            Includes 10% buffer for gas price fluctuations.
                          </span>
                        </span>
                      </span>
                      <span
                        className={`font-medium ${hasEnoughForPaidDeploy ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                      >
                        {isEstimatingGas ? (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </span>
                        ) : (
                          (formattedRequiredBalance ?? "--")
                        )}
                      </span>
                    </div>
                  </div>
                  {!hasEnoughForPaidDeploy && !isEstimatingGas && (
                    <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {hasBalance ? "Insufficient Balance" : "No Balance"}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Custom Sponsor (future feature) */}
            <Card className="cursor-not-allowed border-2 border-transparent opacity-50">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Custom Sponsor
                    </h3>
                    <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Use your own paymaster to sponsor gas
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Refresh button for balance and estimation */}
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => {
              refetchBalance();
              estimateGas();
            }}
            disabled={isEstimatingGas}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isEstimatingGas ? "animate-spin" : ""}`} />
            {isEstimatingGas ? "Refreshing..." : "Refresh Balance & Estimation"}
          </Button>

          {/* Suggest funding if insufficient balance */}
          {!hasEnoughForPaidDeploy && (
            <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={handleGoToFund}>
              <Wallet className="mr-2 h-4 w-4" />
              Fund Your Wallet
            </Button>
          )}

          {/* Back Button */}
          <div className="mt-8">
            <Button
              variant="ghost"
              className="w-full text-zinc-500"
              onClick={() => setView("main")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Options
            </Button>
          </div>
        </>
      )}

      {/* ===== ERC20 VIEW ===== */}
      {view === "erc20" && (
        <>
          <div className="space-y-3">
            {/* Self-funded with ERC20 (future feature) */}
            <Card className="cursor-not-allowed border-2 border-transparent opacity-50">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <Wallet className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Self-funded</h3>
                    <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Pay gas with ERC20 tokens (USDC, USDT, etc.)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Custom Sponsor with ERC20 (future feature) */}
            <Card className="cursor-not-allowed border-2 border-transparent opacity-50">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Custom Sponsor
                    </h3>
                    <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Use your own paymaster with ERC20 support
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back Button */}
          <div className="mt-8">
            <Button
              variant="ghost"
              className="w-full text-zinc-500"
              onClick={() => setView("main")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Options
            </Button>
          </div>
        </>
      )}

      {/* Network Notice */}
      {activeNetwork.isTestnet && (
        <div className="mt-6 rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          You are on {activeNetwork.displayName} (Testnet)
        </div>
      )}
    </div>
  );
}
