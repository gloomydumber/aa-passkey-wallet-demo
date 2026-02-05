"use client";

/**
 * Fund Page
 *
 * Provides funding options for the wallet:
 * - Buy with MoonPay (fiat-to-crypto)
 * - Receive ETH (show address with copy)
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { useBalance, useAccountStatus } from "@/hooks";
import { isMoonPayAvailable, getSignedMoonPayUrl, openMoonPayPopup, getMoonPayInfo, getMoonPayQuote } from "@/lib/moonpay";
import {
  CreditCard,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  Info,
  Copy,
  RefreshCw,
  Rocket,
} from "lucide-react";

type FundState = "idle" | "onramp-confirm" | "onramp-waiting" | "receive";

// Preset USD amounts for selection
const AMOUNT_OPTIONS = [30, 50, 100, 200];

const MIN_ETH_FOR_DEPLOYMENT = "0.001";

// Quote cache type
interface QuoteCache {
  [amount: number]: {
    eth: string;
    loading: boolean;
    error?: boolean;
  };
}

export default function FundPage() {
  const router = useRouter();
  const { accountAddress } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

  const [state, setState] = useState<FundState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(50); // Default $50
  const [quotes, setQuotes] = useState<QuoteCache>({});

  const { balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useBalance({
    address: accountAddress,
  });

  const { isDeployed } = useAccountStatus({
    address: accountAddress,
  });

  const moonPayAvailable = isMoonPayAvailable();
  const moonPayInfo = getMoonPayInfo(activeNetwork);

  // Fetch quotes for all amounts when entering onramp-confirm state
  useEffect(() => {
    if (state !== "onramp-confirm") return;

    // Initialize loading state for all amounts
    const initialQuotes: QuoteCache = {};
    AMOUNT_OPTIONS.forEach((amount) => {
      initialQuotes[amount] = { eth: "...", loading: true };
    });
    setQuotes(initialQuotes);

    // Fetch quotes for each amount
    AMOUNT_OPTIONS.forEach(async (amount) => {
      try {
        const quote = await getMoonPayQuote(amount, activeNetwork);
        const ethAmount = typeof quote.quoteCurrencyAmount === "number"
          ? quote.quoteCurrencyAmount.toFixed(6)
          : parseFloat(quote.quoteCurrencyAmount).toFixed(6);

        setQuotes((prev) => ({
          ...prev,
          [amount]: { eth: ethAmount, loading: false },
        }));
      } catch (err) {
        console.error(`Failed to fetch quote for $${amount}:`, err);
        setQuotes((prev) => ({
          ...prev,
          [amount]: { eth: "N/A", loading: false, error: true },
        }));
      }
    });
  }, [state, activeNetwork]);

  const handleBuyWithCard = useCallback(() => {
    if (!moonPayAvailable) {
      setError("MoonPay is not configured. Please add your API key to .env.local");
      return;
    }
    setState("onramp-confirm");
  }, [moonPayAvailable]);

  const handleOpenMoonPay = useCallback(async () => {
    if (!accountAddress) return;

    try {
      const signedUrl = await getSignedMoonPayUrl({
        walletAddress: accountAddress,
        network: activeNetwork,
        defaultAmount: selectedAmount,
      });

      const popup = openMoonPayPopup(signedUrl);

      if (!popup) {
        setError("Failed to open MoonPay. Please check your popup blocker settings.");
        return;
      }

      setState("onramp-waiting");
    } catch (err) {
      console.error("MoonPay error:", err);
      setError(err instanceof Error ? err.message : "Failed to open MoonPay");
    }
  }, [accountAddress, activeNetwork, selectedAmount]);

  // Get quote for selected amount
  const selectedQuote = quotes[selectedAmount];
  const estimatedEth = selectedQuote?.eth || "...";
  const isQuoteLoading = selectedQuote?.loading ?? true;

  const handleReceive = useCallback(() => {
    setState("receive");
  }, []);

  const handleCopyAddress = useCallback(async () => {
    if (!accountAddress) return;

    try {
      await navigator.clipboard.writeText(accountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [accountAddress]);

  const handleBack = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleGoToDeploy = useCallback(() => {
    router.push("/deploy");
  }, [router]);

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

  // On-ramp confirmation state
  if (state === "onramp-confirm") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Buy {activeNetwork.nativeCurrency.symbol} with MoonPay
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Purchase ETH with your card. Your wallet address will be pre-filled.
          </p>
        </div>

        {/* Amount Selection */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Select Amount
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AMOUNT_OPTIONS.map((amount) => {
                const quote = quotes[amount];
                const isLoading = quote?.loading ?? true;
                const ethAmount = quote?.eth || "...";

                return (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      selectedAmount === amount
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                    }`}
                  >
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      ${amount}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {isLoading ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading...
                        </span>
                      ) : activeNetwork.isTestnet && ethAmount !== "N/A" ? (
                        <>
                          <span className="line-through opacity-50">{ethAmount}</span>
                          {" "}
                          <span>≈ {(parseFloat(ethAmount) / 100).toFixed(6)} {activeNetwork.nativeCurrency.symbol}</span>
                        </>
                      ) : (
                        `≈ ${ethAmount} ${activeNetwork.nativeCurrency.symbol}`
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Real-time price from MoonPay. Actual amount received may vary slightly.
            </p>
          </CardContent>
        </Card>

        {/* Deployment cost callout - only show if not deployed */}
        {isDeployed === false && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Rocket className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">Deployment Cost</p>
                  <p>
                    Your smart account is not yet deployed. To use "Deploy with ETH",
                    you need at least <strong>{MIN_ETH_FOR_DEPLOYMENT} {activeNetwork.nativeCurrency.symbol}</strong>.
                    Make sure to fund enough to cover the deployment cost.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wallet address display */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
              Funds will be sent to:
            </p>
            <p className="font-mono text-sm text-zinc-900 dark:text-zinc-50 break-all bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
              {accountAddress}
            </p>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">
                  {moonPayInfo.environment === "sandbox" ? "Test Mode" : "Live Purchase"}
                </p>
                <p>{moonPayInfo.note}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sandbox 1/100 amount callout */}
        {activeNetwork.isTestnet && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">Sandbox Delivers 1/100 Amount</p>
                  <p>
                    MoonPay sandbox delivers only <strong>1/100</strong> of the quoted amount.
                    {!isQuoteLoading && estimatedEth !== "N/A" && (
                      <> You will receive approximately <strong>{(parseFloat(estimatedEth) / 100).toFixed(6)} {activeNetwork.nativeCurrency.symbol}</strong> instead of {estimatedEth} {activeNetwork.nativeCurrency.symbol}.</>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={handleBack}>
            Back
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleOpenMoonPay}
            disabled={isQuoteLoading}
          >
            {isQuoteLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Buy
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // On-ramp waiting state
  if (state === "onramp-waiting") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Complete Your Purchase
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Finish the purchase in the MoonPay window.
          </p>
        </div>

        {/* Balance display */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Current Balance</span>
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

        {/* What happens next */}
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">After purchase completes:</p>
                <p>
                  Your ETH will arrive in a few minutes. Click the refresh button above to check your balance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={handleBack}>
            Back to Options
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={handleGoToDashboard}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Receive ETH state
  if (state === "receive") {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <ArrowDownToLine className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Receive {activeNetwork.nativeCurrency.symbol}
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Send {activeNetwork.nativeCurrency.symbol} from another wallet or exchange to this address.
          </p>
        </div>

        {/* Address with copy */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Your wallet address</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 font-mono text-sm text-zinc-900 dark:text-zinc-50 break-all bg-zinc-100 dark:bg-zinc-800 p-3 rounded">
                {accountAddress}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyAddress}
                className="flex-shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Network info */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Network: {activeNetwork.displayName}</p>
                <p>
                  Make sure you are sending on the correct network. Funds sent on the wrong network may be lost.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance display */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Current Balance</span>
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

        {/* Prompt to deploy if funded but not deployed */}
        {isDeployed === false && balance && parseFloat(balance.balance) > 0 && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Rocket className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p className="font-medium mb-1">Ready to deploy!</p>
                  <p>You have funds in your wallet. Deploy your account to start using it.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={handleBack}>
            Back
          </Button>
          {isDeployed === false && balance && parseFloat(balance.balance) > 0 ? (
            <Button variant="primary" size="lg" className="flex-1" onClick={handleGoToDeploy}>
              <Rocket className="mr-2 h-4 w-4" />
              Deploy Account
            </Button>
          ) : (
            <Button variant="primary" size="lg" className="flex-1" onClick={handleGoToDashboard}>
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Main options (idle state)
  return (
    <div className="mx-auto max-w-lg p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <ArrowDownToLine className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Fund Your Wallet
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Add {activeNetwork.nativeCurrency.symbol} to your wallet to start using it.
        </p>
      </div>

      {/* Balance display */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Current Balance</span>
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

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funding Options */}
      <div className="space-y-3">
        {/* Option 1: Buy with Card */}
        <Card
          className={`border-2 border-transparent transition-colors ${
            moonPayAvailable
              ? "cursor-pointer hover:border-blue-500 dark:hover:border-blue-600"
              : "cursor-not-allowed opacity-60"
          }`}
          onClick={moonPayAvailable ? handleBuyWithCard : undefined}
        >
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Buy with Card
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Purchase {activeNetwork.nativeCurrency.symbol} via MoonPay
              </p>
              {!moonPayAvailable && (
                <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  API Key Required
                </span>
              )}
              {moonPayAvailable && activeNetwork.isTestnet && (
                <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Test Mode
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Option 2: Receive ETH */}
        <Card
          className="cursor-pointer border-2 border-transparent transition-colors hover:border-green-500 dark:hover:border-green-600"
          onClick={handleReceive}
        >
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <ArrowDownToLine className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Receive {activeNetwork.nativeCurrency.symbol}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Send from another wallet or exchange
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
          onClick={handleGoToDashboard}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
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
