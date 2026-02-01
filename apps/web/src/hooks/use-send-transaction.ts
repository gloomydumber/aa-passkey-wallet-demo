"use client";

/**
 * useSendTransaction Hook
 *
 * Manages the full transaction flow: estimation, confirmation, signing, and submission.
 * State machine: idle → estimating → confirming → signing → pending → success/failed
 */

import { useState, useCallback } from "react";
import { parseEther, formatEther } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { buildTransferCall, createPublicClientForNetwork } from "@aa-wallet/core";
import type { Address, SmartAccountInstance, Network } from "@aa-wallet/types";
import { createBundlerClient, createSmartAccountAdapter } from "@/lib/wallet-client";

export type SendStatus =
  | "idle"
  | "estimating"
  | "confirming"
  | "signing"
  | "pending"
  | "success"
  | "failed";

export interface TransactionDetails {
  to: Address;
  amount: string; // Human-readable ETH amount
  value: bigint; // Wei amount
}

export interface GasEstimate {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
  totalGasCost: bigint;
}

export interface TransactionResult {
  userOpHash: `0x${string}`;
  txHash?: `0x${string}`;
  blockNumber?: number;
}

interface UseSendTransactionOptions {
  account: SmartAccountInstance | null;
  network: Network;
}

interface UseSendTransactionResult {
  // State
  status: SendStatus;
  transaction: TransactionDetails | null;
  gasEstimate: GasEstimate | null;
  result: TransactionResult | null;
  error: string | null;
  isFirstTransaction: boolean;

  // Actions
  prepare: (to: Address, amount: string) => Promise<void>;
  confirm: () => Promise<void>;
  reset: () => void;
}

export function useSendTransaction({
  account,
  network,
}: UseSendTransactionOptions): UseSendTransactionResult {
  const [status, setStatus] = useState<SendStatus>("idle");
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFirstTransaction, setIsFirstTransaction] = useState(false);

  /**
   * Prepare a transaction: build the call and estimate gas
   */
  const prepare = useCallback(
    async (to: Address, amount: string) => {
      if (!account) {
        setError("No account available");
        return;
      }

      setStatus("estimating");
      setError(null);
      setResult(null);

      try {
        // Parse amount to wei
        const value = parseEther(amount);

        // Build the transfer call
        const call = buildTransferCall(to, value);

        // Get the viem account for bundler client
        const viemAccount = account.getViemAccount() as SmartAccount;
        const bundlerClient = createBundlerClient(network, viemAccount);

        // Check if this is the first transaction (account not deployed)
        const adapter = createSmartAccountAdapter(network);
        const isDeployed = await adapter.isDeployed(account.address);
        setIsFirstTransaction(!isDeployed);

        // Estimate gas
        const gasEstimation = await bundlerClient.estimateUserOperationGas({
          account: viemAccount,
          calls: [
            {
              to: call.to,
              value: BigInt(call.value),
              data: call.data,
            },
          ],
        });

        // Get current gas prices from the public client
        const publicClient = createPublicClientForNetwork({ network });
        const feeData = await publicClient.estimateFeesPerGas();

        const maxFeePerGas = feeData.maxFeePerGas ?? BigInt(0);
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? BigInt(0);

        // Calculate total gas cost
        const totalGas =
          gasEstimation.preVerificationGas +
          gasEstimation.verificationGasLimit +
          gasEstimation.callGasLimit;
        const totalGasCost = maxFeePerGas * totalGas;

        setGasEstimate({
          maxFeePerGas,
          maxPriorityFeePerGas,
          preVerificationGas: gasEstimation.preVerificationGas,
          verificationGasLimit: gasEstimation.verificationGasLimit,
          callGasLimit: gasEstimation.callGasLimit,
          totalGasCost,
        });

        setTransaction({ to, amount, value });
        setStatus("confirming");
      } catch (err) {
        console.error("Failed to prepare transaction:", err);
        setError(err instanceof Error ? err.message : "Failed to estimate gas");
        setStatus("failed");
      }
    },
    [account, network]
  );

  /**
   * Confirm and submit the transaction
   */
  const confirm = useCallback(async () => {
    if (!account || !transaction) {
      setError("No transaction to confirm");
      return;
    }

    setStatus("signing");
    setError(null);

    try {
      // Build the transfer call
      const call = buildTransferCall(transaction.to, transaction.value);

      // Get the viem account for bundler client
      const viemAccount = account.getViemAccount() as SmartAccount;
      const bundlerClient = createBundlerClient(network, viemAccount);

      // Send the user operation (this triggers WebAuthn signing)
      const userOpHash = await bundlerClient.sendUserOperation({
        account: viemAccount,
        calls: [
          {
            to: call.to,
            value: BigInt(call.value),
            data: call.data,
          },
        ],
      });

      setResult({ userOpHash });
      setStatus("pending");

      // Wait for the receipt
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      setResult({
        userOpHash,
        txHash: receipt.receipt.transactionHash,
        blockNumber: Number(receipt.receipt.blockNumber),
      });
      setStatus("success");
    } catch (err) {
      console.error("Transaction failed:", err);

      // Check for user cancellation
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      if (
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        errorMessage.includes("user rejected") ||
        errorMessage.includes("NotAllowedError")
      ) {
        setError("Transaction cancelled by user");
      } else {
        setError(errorMessage);
      }
      setStatus("failed");
    }
  }, [account, network, transaction]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setStatus("idle");
    setTransaction(null);
    setGasEstimate(null);
    setResult(null);
    setError(null);
    setIsFirstTransaction(false);
  }, []);

  return {
    status,
    transaction,
    gasEstimate,
    result,
    error,
    isFirstTransaction,
    prepare,
    confirm,
    reset,
  };
}

/**
 * Format gas cost for display
 */
export function formatGasCost(gasCost: bigint): string {
  return formatEther(gasCost);
}
