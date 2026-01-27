/**
 * Formatting utilities for AA Passkey Wallet
 */

/**
 * Format a bigint value to a human-readable string with decimals
 */
export function formatUnits(value: bigint | string, decimals: number): string {
  const valueBigInt = typeof value === "string" ? BigInt(value) : value;
  const divisor = BigInt(10 ** decimals);
  const integerPart = valueBigInt / divisor;
  const fractionalPart = valueBigInt % divisor;

  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "");

  return `${integerPart}.${trimmedFractional}`;
}

/**
 * Parse a human-readable string to bigint with decimals
 */
export function parseUnits(value: string, decimals: number): bigint {
  const [integerPart, fractionalPart = ""] = value.split(".");

  const paddedFractional = fractionalPart.slice(0, decimals).padEnd(decimals, "0");
  const combined = integerPart + paddedFractional;

  return BigInt(combined);
}

/**
 * Format a balance for display with symbol
 */
export function formatBalance(
  balance: bigint | string,
  decimals: number,
  symbol: string,
  maxDecimals = 4
): string {
  const formatted = formatUnits(balance, decimals);
  const parts = formatted.split(".");
  const intPart = parts[0] ?? "0";
  const fracPart = parts[1];

  let displayValue: string;
  if (fracPart) {
    displayValue = `${intPart}.${fracPart.slice(0, maxDecimals)}`;
  } else {
    displayValue = intPart;
  }

  return `${displayValue} ${symbol}`;
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number | string, decimals = 2): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a timestamp to a readable date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format a relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
