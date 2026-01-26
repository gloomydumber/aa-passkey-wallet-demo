/**
 * Address utilities for AA Passkey Wallet
 */

import type { Address } from "@aa-wallet/types";

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Shorten an address for display (e.g., 0x1234...5678)
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!isValidAddress(address)) {
    return address;
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Normalize an address to checksum format
 */
export function normalizeAddress(address: string): Address {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address.toLowerCase() as Address;
}

/**
 * Compare two addresses (case-insensitive)
 */
export function addressEquals(a: string, b: string): boolean {
  if (!isValidAddress(a) || !isValidAddress(b)) {
    return false;
  }
  return a.toLowerCase() === b.toLowerCase();
}
