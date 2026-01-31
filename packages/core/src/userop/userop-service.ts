/**
 * UserOperation Service
 * Handles building, gas estimation, and submission of UserOperations
 */

import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import type {
  Address,
  SmartAccountInstance,
  UserOperationRequest,
  UserOperationResult,
  Token,
} from "@aa-wallet/types";

export interface SendTransferParams {
  account: SmartAccountInstance;
  to: Address;
  value: bigint;
}

export interface SendTokenTransferParams {
  account: SmartAccountInstance;
  token: Token;
  to: Address;
  amount: string; // Human-readable amount (e.g., "100" for 100 USDC)
}

export interface SendUserOpParams {
  account: SmartAccountInstance;
  calls: UserOperationRequest[];
}

/**
 * Build a native token transfer call
 */
export function buildTransferCall(to: Address, value: bigint): UserOperationRequest {
  return {
    to,
    value: value.toString(),
    data: "0x",
  };
}

/**
 * Build an ERC-20 token transfer call
 */
export function buildTokenTransferCall(
  token: Token,
  to: Address,
  amount: string
): UserOperationRequest {
  const parsedAmount = parseUnits(amount, token.decimals);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, parsedAmount],
  });

  return {
    to: token.address,
    value: "0",
    data,
  };
}

/**
 * Encode calls using the smart account
 */
export async function encodeCalls(
  account: SmartAccountInstance,
  calls: UserOperationRequest[]
): Promise<`0x${string}`> {
  if (calls.length === 0) {
    throw new Error("No calls to encode");
  }

  if (calls.length === 1) {
    const call = calls[0]!;
    return account.encodeExecute({
      to: call.to,
      value: BigInt(call.value),
      data: call.data,
    });
  }

  return account.encodeBatchExecute(
    calls.map((call) => ({
      to: call.to,
      value: BigInt(call.value),
      data: call.data,
    }))
  );
}

/**
 * Create a pending UserOperation result
 */
export function createPendingResult(userOpHash: `0x${string}`): UserOperationResult {
  return {
    userOpHash,
    status: "pending",
  };
}

/**
 * Create a submitted UserOperation result
 */
export function createSubmittedResult(userOpHash: `0x${string}`): UserOperationResult {
  return {
    userOpHash,
    status: "submitted",
  };
}

/**
 * Create a success UserOperation result
 */
export function createSuccessResult(
  userOpHash: `0x${string}`,
  txHash: `0x${string}`,
  blockNumber: number
): UserOperationResult {
  return {
    userOpHash,
    txHash,
    blockNumber,
    status: "success",
  };
}

/**
 * Create a failed UserOperation result
 */
export function createFailedResult(userOpHash: `0x${string}`): UserOperationResult {
  return {
    userOpHash,
    status: "failed",
  };
}
