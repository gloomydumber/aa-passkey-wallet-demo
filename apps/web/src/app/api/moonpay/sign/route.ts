/**
 * MoonPay URL Signing API Route
 *
 * Signs MoonPay widget URLs with HMAC-SHA256 to enable pre-filled wallet addresses.
 * MoonPay requires signed URLs when passing sensitive data like wallet addresses.
 *
 * @see https://dev.moonpay.com/docs/ramps-sdk-buy-params
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// MoonPay widget base URLs
const MOONPAY_SANDBOX_URL = "https://buy-sandbox.moonpay.com";
const MOONPAY_PRODUCTION_URL = "https://buy.moonpay.com";

// Currency codes for supported networks
const NETWORK_CURRENCY_CODES: Record<string, string> = {
  "1": "eth",
  "11155111": "eth",
  "42161": "eth_arbitrum",
  "421614": "eth_arbitrum",
};

interface SignRequest {
  walletAddress: string;
  chainId: number;
  isTestnet: boolean;
  defaultAmount?: number;
  fiatCurrency?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignRequest = await request.json();
    const { walletAddress, chainId, isTestnet, defaultAmount = 50, fiatCurrency = "usd" } = body;

    // Validate wallet address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Get API keys from environment
    const apiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY;
    const secretKey = process.env.MOONPAY_SECRET_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "MoonPay API key not configured" },
        { status: 500 }
      );
    }

    if (!secretKey) {
      // If no secret key, return unsigned URL (wallet address won't be pre-filled)
      return NextResponse.json(
        { error: "MoonPay secret key not configured. Wallet address cannot be pre-filled." },
        { status: 500 }
      );
    }

    // Determine base URL
    const baseUrl = isTestnet ? MOONPAY_SANDBOX_URL : MOONPAY_PRODUCTION_URL;

    // Get currency code
    const currencyCode = NETWORK_CURRENCY_CODES[chainId.toString()] || "eth";

    // Build query parameters
    const params = new URLSearchParams({
      apiKey,
      walletAddress,
      currencyCode,
      baseCurrencyCode: fiatCurrency,
      baseCurrencyAmount: defaultAmount.toString(),
    });

    // Create the query string to sign (without the base URL)
    const queryString = `?${params.toString()}`;

    // Sign the query string with HMAC-SHA256
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(queryString)
      .digest("base64url");

    // Append signature to params
    params.set("signature", signature);

    // Build final URL
    const signedUrl = `${baseUrl}?${params.toString()}`;

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("MoonPay sign error:", error);
    return NextResponse.json(
      { error: "Failed to sign MoonPay URL" },
      { status: 500 }
    );
  }
}
