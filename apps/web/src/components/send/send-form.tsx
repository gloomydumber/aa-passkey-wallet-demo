"use client";

/**
 * Send Form Component
 *
 * Form with recipient address and amount inputs for ETH transfers.
 */

import { useState, useCallback, useMemo } from "react";
import { isAddress, parseEther, formatEther } from "viem";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AmountInput } from "./amount-input";
import type { Address, NativeBalance } from "@aa-wallet/types";
import type { GasEstimate } from "@/hooks/use-send-transaction";

interface SendFormProps {
  balance: NativeBalance | null;
  isLoading: boolean;
  gasEstimate: GasEstimate | null;
  /** Pre-estimated gas from page load (used for MAX button) */
  preEstimatedGas: GasEstimate | null;
  chainId: number;
  onSubmit: (to: Address, amount: string) => void;
}

export function SendForm({ balance, isLoading, gasEstimate, preEstimatedGas, chainId, onSubmit }: SendFormProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState({ recipient: false, amount: false });

  // Validation
  const recipientError = useMemo(() => {
    if (!touched.recipient || !recipient) return undefined;
    if (!isAddress(recipient)) return "Invalid address";
    return undefined;
  }, [recipient, touched.recipient]);

  const amountError = useMemo(() => {
    if (!touched.amount || !amount) return undefined;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "Invalid amount";
    if (numAmount <= 0) return "Amount must be greater than 0";

    if (balance) {
      try {
        const amountWei = parseEther(amount);
        const balanceWei = BigInt(balance.balance);
        const totalRequired = gasEstimate
          ? amountWei + gasEstimate.totalGasCost
          : amountWei;
        if (totalRequired > balanceWei) {
          return "Insufficient balance";
        }
      } catch {
        return "Invalid amount format";
      }
    }

    return undefined;
  }, [amount, touched.amount, balance, gasEstimate]);

  const isValid = useMemo(() => {
    if (!recipient || !amount) return false;
    if (!isAddress(recipient)) return false;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return false;

    if (balance) {
      try {
        const amountWei = parseEther(amount);
        const balanceWei = BigInt(balance.balance);
        if (amountWei > balanceWei) return false;
      } catch {
        return false;
      }
    }

    return true;
  }, [recipient, amount, balance]);

  // Format balance for display
  // For small balances, show full precision to avoid confusion
  const formattedBalance = useMemo(() => {
    if (!balance) return undefined;
    // Use formattedBalance directly from viem's formatEther which preserves precision
    return balance.formattedBalance;
  }, [balance]);

  // Handle max button click
  const handleMaxClick = useCallback(() => {
    if (!balance) return;

    const balanceWei = BigInt(balance.balance);

    // Use actual gas estimate: prefer current estimate, fall back to pre-estimated
    const estimatedGas = gasEstimate ?? preEstimatedGas;

    if (!estimatedGas) {
      // No gas estimate yet - can't calculate max accurately
      // Set 90% of balance as a rough approximation
      const roughMax = (balanceWei * BigInt(90)) / BigInt(100);
      if (roughMax > BigInt(0)) {
        setAmount(formatEther(roughMax));
        setTouched((prev) => ({ ...prev, amount: true }));
      }
      return;
    }

    // Add 20% safety buffer to gas estimate - actual gas can vary slightly from estimate
    // This prevents inner transaction failures when sending max
    const reserveForGas = (estimatedGas.totalGasCost * BigInt(120)) / BigInt(100);

    if (balanceWei <= reserveForGas) {
      // Balance too low - set full balance and let validation show error
      const formatted = formatEther(balanceWei);
      setAmount(formatted);
      setTouched((prev) => ({ ...prev, amount: true }));
      return;
    }

    const maxAmount = balanceWei - reserveForGas;
    const formatted = formatEther(maxAmount);
    setAmount(formatted);
    setTouched((prev) => ({ ...prev, amount: true }));
  }, [balance, gasEstimate, preEstimatedGas]);

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isValid && !isLoading) {
        onSubmit(recipient as Address, amount);
      }
    },
    [isValid, isLoading, recipient, amount, onSubmit]
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Recipient
            </label>
            <Input
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, recipient: true }))}
              error={recipientError}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Amount */}
          <AmountInput
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              // Only allow valid decimal input
              const value = e.target.value;
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                setAmount(value);
              }
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, amount: true }))}
            balance={formattedBalance}
            symbol={balance?.symbol ?? "ETH"}
            onMaxClick={handleMaxClick}
            error={amountError}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!isValid || isLoading}
            isLoading={isLoading}
          >
            {isLoading ? "Estimating..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
