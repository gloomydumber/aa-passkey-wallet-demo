/**
 * Validation utilities for AA Passkey Wallet
 */

import { isValidAddress } from "./address";

/**
 * Validate a positive number string
 */
export function isValidAmount(value: string): boolean {
  if (!value || value.trim() === "") return false;

  // Check for valid number format
  const regex = /^[0-9]*\.?[0-9]+$/;
  if (!regex.test(value)) return false;

  // Check it's positive
  const num = parseFloat(value);
  return num > 0 && isFinite(num);
}

/**
 * Validate a hex string
 */
export function isValidHex(value: string): boolean {
  return /^0x[a-fA-F0-9]*$/.test(value);
}

/**
 * Validate a transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate transfer input
 */
export interface TransferValidation {
  isValid: boolean;
  errors: {
    to?: string;
    amount?: string;
  };
}

export function validateTransfer(
  to: string,
  amount: string,
  balance: string,
  decimals: number
): TransferValidation {
  const errors: TransferValidation["errors"] = {};

  // Validate recipient address
  if (!to) {
    errors.to = "Recipient address is required";
  } else if (!isValidAddress(to)) {
    errors.to = "Invalid recipient address";
  }

  // Validate amount
  if (!amount) {
    errors.amount = "Amount is required";
  } else if (!isValidAmount(amount)) {
    errors.amount = "Invalid amount";
  } else {
    // Check sufficient balance
    try {
      const amountBigInt = parseFloat(amount) * 10 ** decimals;
      const balanceBigInt = BigInt(balance);
      if (BigInt(Math.floor(amountBigInt)) > balanceBigInt) {
        errors.amount = "Insufficient balance";
      }
    } catch {
      errors.amount = "Invalid amount";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
