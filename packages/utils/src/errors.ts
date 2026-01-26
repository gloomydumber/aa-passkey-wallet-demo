/**
 * Error handling utilities for AA Passkey Wallet
 */

export class WalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "WalletError";
  }
}

export class NetworkError extends WalletError {
  constructor(message: string, details?: unknown) {
    super(message, "NETWORK_ERROR", details);
    this.name = "NetworkError";
  }
}

export class TransactionError extends WalletError {
  constructor(message: string, details?: unknown) {
    super(message, "TRANSACTION_ERROR", details);
    this.name = "TransactionError";
  }
}

export class PasskeyError extends WalletError {
  constructor(message: string, details?: unknown) {
    super(message, "PASSKEY_ERROR", details);
    this.name = "PasskeyError";
  }
}

export class StorageError extends WalletError {
  constructor(message: string, details?: unknown) {
    super(message, "STORAGE_ERROR", details);
    this.name = "StorageError";
  }
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

/**
 * Check if error is a user rejection (e.g., user cancelled passkey)
 */
export function isUserRejection(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("user cancelled") ||
      message.includes("user rejected") ||
      message.includes("user denied") ||
      message.includes("not allowed")
    );
  }
  return false;
}
