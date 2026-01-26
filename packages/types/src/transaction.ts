/**
 * Transaction types for AA Passkey Wallet
 */

export type TransactionStatus = "pending" | "submitted" | "success" | "failed";

export type TransactionType = "transfer" | "token_transfer" | "contract_call" | "account_deploy";

export interface UserOperationRequest {
  /** Target address */
  to: `0x${string}`;
  /** Value in wei (as string for serialization) */
  value: string;
  /** Call data */
  data: `0x${string}`;
}

export interface UserOperationGas {
  /** Pre-verification gas */
  preVerificationGas: string;
  /** Verification gas limit */
  verificationGasLimit: string;
  /** Call gas limit */
  callGasLimit: string;
  /** Max fee per gas */
  maxFeePerGas: string;
  /** Max priority fee per gas */
  maxPriorityFeePerGas: string;
}

export interface UserOperationResult {
  /** User operation hash */
  userOpHash: `0x${string}`;
  /** Transaction hash (available after inclusion) */
  txHash?: `0x${string}`;
  /** Block number (available after inclusion) */
  blockNumber?: number;
  /** Status */
  status: TransactionStatus;
}

export interface Transaction {
  /** Unique transaction ID (local) */
  id: string;
  /** Transaction type */
  type: TransactionType;
  /** User operation hash */
  userOpHash: `0x${string}`;
  /** Transaction hash (if available) */
  txHash?: `0x${string}`;
  /** From address (smart account) */
  from: `0x${string}`;
  /** To address */
  to: `0x${string}`;
  /** Value in wei (as string) */
  value: string;
  /** Token address (for token transfers) */
  tokenAddress?: `0x${string}`;
  /** Token symbol (for token transfers) */
  tokenSymbol?: string;
  /** Token decimals (for token transfers) */
  tokenDecimals?: number;
  /** Status */
  status: TransactionStatus;
  /** Chain ID */
  chainId: number;
  /** Timestamp */
  timestamp: number;
  /** Gas used (after completion) */
  gasUsed?: string;
  /** Error message (if failed) */
  error?: string;
}

export interface TransactionState {
  /** Pending transactions */
  pendingTransactions: Transaction[];
  /** Transaction history */
  history: Transaction[];
  /** Currently processing transaction */
  currentTransaction: Transaction | null;
}
