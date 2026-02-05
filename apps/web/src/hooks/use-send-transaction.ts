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
import { buildTransferCall } from "@aa-wallet/core";
import type { Address, SmartAccountInstance, Network } from "@aa-wallet/types";
import { createBundlerClient, createSmartAccountAdapter, getPublicClient } from "@/lib/wallet-client";
import { getRequiredPrefund } from "permissionless/utils";

/**
 * Fetch gas prices from Pimlico's API
 * Pimlico bundler requires higher gas prices than generic RPC - use their API directly
 */
async function getPimlicoGasPrice(bundlerUrl: string): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}> {
  const response = await fetch(bundlerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "pimlico_getUserOperationGasPrice",
      params: [],
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "Failed to get gas price from Pimlico");
  }

  // Use "fast" tier for reliable inclusion, add 10% buffer
  const fast = data.result.fast;
  const maxFeePerGas = (BigInt(fast.maxFeePerGas) * BigInt(110)) / BigInt(100);
  const maxPriorityFeePerGas = (BigInt(fast.maxPriorityFeePerGas) * BigInt(110)) / BigInt(100);

  return { maxFeePerGas, maxPriorityFeePerGas };
}

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
  /** Actual gas cost paid (from UserOperationEvent) */
  actualGasCost?: bigint;
}

interface UseSendTransactionOptions {
  account: SmartAccountInstance | null;
  network: Network;
  /** Enable sponsored transactions via paymaster */
  sponsored?: boolean;
}

interface UseSendTransactionResult {
  // State
  status: SendStatus;
  transaction: TransactionDetails | null;
  gasEstimate: GasEstimate | null;
  result: TransactionResult | null;
  error: string | null;
  isFirstTransaction: boolean;
  /** Pre-estimated gas (fetched on mount for MAX button) */
  preEstimatedGas: GasEstimate | null;

  // Actions
  prepare: (to: Address, amount: string) => Promise<void>;
  confirm: () => Promise<void>;
  reset: () => void;
  /** Pre-estimate gas without starting the transaction flow */
  preEstimate: () => Promise<void>;
}

export function useSendTransaction({
  account,
  network,
  sponsored = false,
}: UseSendTransactionOptions): UseSendTransactionResult {
  const [status, setStatus] = useState<SendStatus>("idle");
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [preEstimatedGas, setPreEstimatedGas] = useState<GasEstimate | null>(null);
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
        const bundlerClient = createBundlerClient(network, viemAccount, { sponsored });

        // Check if this is the first transaction (account not deployed)
        const adapter = createSmartAccountAdapter(network);
        const isDeployed = await adapter.isDeployed(account.address);
        setIsFirstTransaction(!isDeployed);

        // Estimate gas limits
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

        // Get gas prices from Pimlico's API (not RPC - Pimlico requires higher gas prices)
        const { maxFeePerGas, maxPriorityFeePerGas } = await getPimlicoGasPrice(network.bundlerUrl);

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
    [account, network, sponsored]
  );

  /**
   * Pre-estimate gas without starting transaction flow
   * Used for MAX button to know actual gas cost before user enters amount
   */
  const preEstimate = useCallback(async () => {
    if (!account) return;

    try {
      // Use a minimal test amount for estimation (gas is roughly the same regardless of amount)
      const testValue = parseEther("0.0001");
      // Use a dummy address for estimation
      const testTo = "0x0000000000000000000000000000000000000001" as Address;

      const call = buildTransferCall(testTo, testValue);
      const viemAccount = account.getViemAccount() as SmartAccount;
      const bundlerClient = createBundlerClient(network, viemAccount, { sponsored });

      // Estimate gas limits
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

      // Get gas prices from Pimlico's API (not RPC - Pimlico requires higher gas prices)
      const { maxFeePerGas, maxPriorityFeePerGas } = await getPimlicoGasPrice(network.bundlerUrl);

      const totalGas =
        gasEstimation.preVerificationGas +
        gasEstimation.verificationGasLimit +
        gasEstimation.callGasLimit;
      const totalGasCost = maxFeePerGas * totalGas;

      setPreEstimatedGas({
        maxFeePerGas,
        maxPriorityFeePerGas,
        preVerificationGas: gasEstimation.preVerificationGas,
        verificationGasLimit: gasEstimation.verificationGasLimit,
        callGasLimit: gasEstimation.callGasLimit,
        totalGasCost,
      });
    } catch (err) {
      console.error("Failed to pre-estimate gas:", err);
      // Don't set error state - this is a background operation
    }
  }, [account, network, sponsored]);

  /**
   * Confirm and submit the transaction
   */
  const confirm = useCallback(async () => {
    if (!account || !transaction || !gasEstimate) {
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
      const bundlerClient = createBundlerClient(network, viemAccount, { sponsored });

      // Safety check: verify balance covers prefund + send amount
      // EntryPoint deducts prefund during validation, reducing SmartAccount balance.
      // If remaining balance < send amount, the internal execution fails
      // and the prefund gets stuck in EntryPoint.
      if (!sponsored) {
        const publicClient = getPublicClient(network);
        const currentBalance = await publicClient.getBalance({
          address: account.address as `0x${string}`,
        });

        const requiredPrefund = getRequiredPrefund({
          userOperation: {
            sender: account.address as `0x${string}`,
            nonce: BigInt(0),
            callData: "0x" as `0x${string}`,
            callGasLimit: gasEstimate.callGasLimit,
            verificationGasLimit: gasEstimate.verificationGasLimit,
            preVerificationGas: gasEstimate.preVerificationGas,
            maxFeePerGas: gasEstimate.maxFeePerGas,
            maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
            signature: "0x" as `0x${string}`,
            paymasterAndData: "0x" as `0x${string}`,
          },
          entryPointVersion: "0.6",
        });

        const totalRequired = requiredPrefund + transaction.value;
        if (currentBalance < totalRequired) {
          setError(
            `Insufficient balance. Required: ${formatEther(totalRequired)} ETH (${formatEther(requiredPrefund)} gas + ${formatEther(transaction.value)} send), Available: ${formatEther(currentBalance)} ETH`
          );
          setStatus("failed");
          return;
        }
      }

      // Send the user operation with LOCKED gas parameters from prepare()
      // This ensures the gas cost matches what was shown to user during confirmation
      // If gas prices spiked, bundler will reject with "maxFeePerGas too low" (safe failure)
      // rather than executing with higher gas and causing insufficient balance for transfer
      const userOpHash = await bundlerClient.sendUserOperation({
        account: viemAccount,
        calls: [
          {
            to: call.to,
            value: BigInt(call.value),
            data: call.data,
          },
        ],
        // Locked gas parameters - use exactly what was estimated in prepare()
        maxFeePerGas: gasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
        callGasLimit: gasEstimate.callGasLimit,
        verificationGasLimit: gasEstimate.verificationGasLimit,
        preVerificationGas: gasEstimate.preVerificationGas,
      });

      setResult({ userOpHash });
      setStatus("pending");

      // Wait for the receipt
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      // Extract actual gas cost from the receipt
      // The receipt contains actualGasCost from UserOperationEvent
      const actualGasCost = receipt.actualGasCost
        ? BigInt(receipt.actualGasCost)
        : undefined;

      setResult({
        userOpHash,
        txHash: receipt.receipt.transactionHash,
        blockNumber: Number(receipt.receipt.blockNumber),
        actualGasCost,
      });
      setStatus("success");
    } catch (err) {
      console.error("Transaction failed:", err);

      // Check for specific error types and provide helpful messages
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      const lowerMessage = errorMessage.toLowerCase();

      if (
        lowerMessage.includes("cancelled") ||
        lowerMessage.includes("canceled") ||
        lowerMessage.includes("user rejected") ||
        lowerMessage.includes("notallowederror")
      ) {
        setError("Transaction cancelled by user");
      } else if (
        lowerMessage.includes("maxfeepergas") ||
        lowerMessage.includes("max fee per gas") ||
        lowerMessage.includes("gas price") ||
        lowerMessage.includes("underpriced")
      ) {
        // Gas price increased since estimation - safe failure, user can retry
        setError("Gas price has increased. Please try again to get updated estimates.");
      } else {
        setError(errorMessage);
      }
      setStatus("failed");
    }
  }, [account, network, transaction, gasEstimate, sponsored]);

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
    preEstimatedGas,
    result,
    error,
    isFirstTransaction,
    prepare,
    confirm,
    reset,
    preEstimate,
  };
}

/**
 * Format gas cost for display
 */
export function formatGasCost(gasCost: bigint): string {
  return formatEther(gasCost);
}
