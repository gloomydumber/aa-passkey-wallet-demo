/**
 * MoonPay On-Ramp Integration
 *
 * Provides utilities for integrating MoonPay's fiat-to-crypto widget.
 * Uses sandbox environment for testnets, production for mainnet.
 * URLs are signed server-side to enable pre-filled wallet addresses.
 *
 * @see https://dev.moonpay.com/docs/on-ramp-quickstart
 * @see https://dev.moonpay.com/docs/faq-sandbox-testing
 * @see https://dev.moonpay.com/docs/ramps-sdk-buy-params
 */

import type { Network } from "@aa-wallet/types";

export interface MoonPayWidgetOptions {
  /** Wallet address to receive funds */
  walletAddress: string;
  /** Network configuration */
  network: Network;
  /** Optional: Default fiat amount */
  defaultAmount?: number;
  /** Optional: Fiat currency code (default: USD) */
  fiatCurrency?: string;
}

/**
 * Check if MoonPay is available for the current configuration
 */
export function isMoonPayAvailable(): boolean {
  const apiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY;
  return !!apiKey && apiKey !== "pk_test_your_api_key_here";
}

/**
 * Networks supported by MoonPay on-ramp
 * Note: MoonPay sandbox only supports Ethereum Sepolia, not Arbitrum Sepolia
 */
const MOONPAY_SUPPORTED_CHAIN_IDS: number[] = [
  1,        // Ethereum Mainnet
  11155111, // Ethereum Sepolia
  // 42161,  // Arbitrum One - not enabled for now
  // 421614, // Arbitrum Sepolia - not supported in MoonPay sandbox
];

/**
 * Check if MoonPay supports the given network for on-ramp
 */
export function isMoonPaySupportedNetwork(network: Network): boolean {
  return MOONPAY_SUPPORTED_CHAIN_IDS.includes(network.chainId);
}

/**
 * Get unsupported network message
 */
export function getMoonPayUnsupportedMessage(network: Network): string {
  if (network.chainId === 421614) {
    return "MoonPay does not support Arbitrum Sepolia testnet. Switch to Sepolia or use the Receive option to get ETH from a faucet.";
  }
  if (network.chainId === 42161) {
    return "MoonPay on-ramp for Arbitrum is not enabled. Use the Receive option to transfer ETH from another wallet.";
  }
  return `MoonPay does not support ${network.displayName}. Use the Receive option instead.`;
}

/**
 * Get signed MoonPay widget URL from server
 *
 * Calls the /api/moonpay/sign endpoint to get a signed URL with
 * the wallet address pre-filled.
 *
 * @param options Widget configuration options
 * @returns Signed MoonPay widget URL
 * @throws Error if signing fails
 */
export async function getSignedMoonPayUrl(options: MoonPayWidgetOptions): Promise<string> {
  const { walletAddress, network, defaultAmount = 50, fiatCurrency = "usd" } = options;

  const response = await fetch("/api/moonpay/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      walletAddress,
      chainId: network.chainId,
      isTestnet: network.isTestnet,
      defaultAmount,
      fiatCurrency,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get signed MoonPay URL");
  }

  const data = await response.json();
  return data.url;
}

/**
 * Open MoonPay widget in a new window with signed URL
 *
 * @param url Signed MoonPay URL
 * @returns Window reference or null if failed to open
 */
export function openMoonPayPopup(url: string): Window | null {
  // Open in centered popup window
  const width = 450;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const windowFeatures = `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`;

  return window.open(url, "moonpay-widget", windowFeatures);
}

/**
 * Get display information for MoonPay
 */
export function getMoonPayInfo(network: Network): {
  environment: "sandbox" | "production";
  note: string;
} {
  if (network.isTestnet) {
    return {
      environment: "sandbox",
      note: "Test mode: Use test card numbers. KYC can be skipped.",
    };
  }

  return {
    environment: "production",
    note: "You will be redirected to MoonPay to complete your purchase.",
  };
}

export interface MoonPayQuote {
  quoteCurrencyAmount: number | string;
  baseCurrencyAmount: number;
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  feeAmount?: number;
  networkFeeAmount?: number;
  totalAmount?: number;
  isFallback: boolean;
}

/**
 * Get a real-time buy quote from MoonPay
 *
 * @param baseCurrencyAmount - Amount in fiat currency (e.g., 50 for $50)
 * @param network - Network configuration
 * @returns Quote with estimated crypto amount
 */
export async function getMoonPayQuote(
  baseCurrencyAmount: number,
  network: Network
): Promise<MoonPayQuote> {
  const response = await fetch("/api/moonpay/quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      baseCurrencyAmount,
      chainId: network.chainId,
      isTestnet: network.isTestnet,
      baseCurrencyCode: "usd",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch quote");
  }

  return response.json();
}
