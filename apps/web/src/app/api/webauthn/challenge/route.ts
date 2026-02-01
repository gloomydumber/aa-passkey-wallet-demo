/**
 * WebAuthn Challenge API Route
 *
 * Generates random challenges for WebAuthn registration/authentication.
 */

import { NextResponse } from "next/server";
import { generateChallenge } from "@aa-wallet/passkey";

export async function POST() {
  try {
    const challenge = generateChallenge();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    return NextResponse.json({
      challenge,
      expiresAt,
    });
  } catch (error) {
    console.error("Failed to generate challenge:", error);
    return NextResponse.json(
      { error: "Failed to generate challenge" },
      { status: 500 }
    );
  }
}
