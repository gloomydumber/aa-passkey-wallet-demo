/**
 * MoonPay Quote API Route
 *
 * Fetches real-time buy quotes from MoonPay API.
 * Returns estimated crypto amount for a given fiat amount.
 *
 * @see https://dev.moonpay.com/reference/getbuyquote-1
 */

import { NextRequest, NextResponse } from "next/server";

// MoonPay API base URLs
const MOONPAY_SANDBOX_API = "https://api.moonpay.com";
// const MOONPAY_PRODUCTION_API = "https://api.moonpay.com"; // Reserved for future production use

// Currency codes for supported networks
const NETWORK_CURRENCY_CODES: Record<string, string> = {
  "1": "eth",
  "11155111": "eth", // Sepolia uses same currency code
  "42161": "eth_arbitrum",
  "421614": "eth_arbitrum", // Arbitrum Sepolia
};

interface QuoteRequest {
  baseCurrencyAmount: number;
  chainId: number;
  isTestnet: boolean;
  baseCurrencyCode?: string;
}

interface MoonPayQuoteResponse {
  baseCurrencyAmount: number;
  quoteCurrencyAmount: number;
  quoteCurrencyCode: string;
  baseCurrencyCode: string;
  feeAmount: number;
  networkFeeAmount: number;
  extraFeeAmount: number;
  totalAmount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json();
    const { baseCurrencyAmount, chainId, isTestnet: _isTestnet, baseCurrencyCode = "usd" } = body;

    // Validate amount
    if (!baseCurrencyAmount || baseCurrencyAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Get API key
    const apiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "MoonPay API key not configured" }, { status: 500 });
    }

    // Get currency code for the network
    const currencyCode = NETWORK_CURRENCY_CODES[chainId.toString()] || "eth";

    // Build API URL
    // Note: MoonPay sandbox and production use the same API endpoint
    // The sandbox vs production is determined by the API key type
    const baseUrl = MOONPAY_SANDBOX_API;
    const url = new URL(`${baseUrl}/v3/currencies/${currencyCode}/buy_quote`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("baseCurrencyCode", baseCurrencyCode);
    url.searchParams.set("baseCurrencyAmount", baseCurrencyAmount.toString());

    // Fetch quote from MoonPay
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MoonPay quote error:", response.status, errorText);

      // Return a fallback estimate if API fails
      return NextResponse.json({
        quoteCurrencyAmount: (baseCurrencyAmount / 2500).toFixed(6), // Fallback estimate
        baseCurrencyAmount,
        baseCurrencyCode,
        quoteCurrencyCode: currencyCode,
        isFallback: true,
      });
    }

    const quoteData: MoonPayQuoteResponse = await response.json();

    return NextResponse.json({
      quoteCurrencyAmount: quoteData.quoteCurrencyAmount,
      baseCurrencyAmount: quoteData.baseCurrencyAmount,
      baseCurrencyCode: quoteData.baseCurrencyCode,
      quoteCurrencyCode: quoteData.quoteCurrencyCode,
      feeAmount: quoteData.feeAmount,
      networkFeeAmount: quoteData.networkFeeAmount,
      totalAmount: quoteData.totalAmount,
      isFallback: false,
    });
  } catch (error) {
    console.error("MoonPay quote error:", error);

    // Return a fallback estimate on error
    return NextResponse.json({
      quoteCurrencyAmount: "0.020", // Fallback for $50
      isFallback: true,
      error: "Failed to fetch quote",
    });
  }
}
