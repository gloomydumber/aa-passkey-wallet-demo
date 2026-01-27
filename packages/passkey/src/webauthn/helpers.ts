/**
 * WebAuthn helper utilities
 */

import { PasskeyError } from "@aa-wallet/utils";
import { base64UrlToUint8Array, uint8ArrayToBase64Url } from "@aa-wallet/utils";

/**
 * Convert base64url string to ArrayBuffer for WebAuthn API
 */
export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  return base64UrlToUint8Array(base64url).buffer as ArrayBuffer;
}

/**
 * Convert ArrayBuffer to base64url string
 */
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  return uint8ArrayToBase64Url(new Uint8Array(buffer));
}

/**
 * Parse COSE public key from attestation data
 */
export function parseCOSEPublicKey(authData: Uint8Array): {
  publicKey: Uint8Array;
  algorithm: number;
  aaguid: string;
} {
  // Authenticator data structure:
  // - rpIdHash: 32 bytes
  // - flags: 1 byte
  // - signCount: 4 bytes
  // - aaguid: 16 bytes (if attested credential data present)
  // - credentialIdLength: 2 bytes
  // - credentialId: L bytes
  // - credentialPublicKey: variable (COSE key)

  const flags = authData[32]!;
  const attestedCredentialDataPresent = (flags & 0x40) !== 0;

  if (!attestedCredentialDataPresent) {
    throw new PasskeyError("No attested credential data present");
  }

  // AAGUID is at offset 37 (32 + 1 + 4)
  const aaguid = authData.slice(37, 53);
  const aaguidHex = Array.from(aaguid)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Credential ID length is at offset 53
  const credIdLength = (authData[53]! << 8) | authData[54]!;

  // Public key starts after credential ID
  const publicKeyStart = 55 + credIdLength;
  const publicKey = authData.slice(publicKeyStart);

  // Parse COSE key to get algorithm
  // COSE key is CBOR encoded, algorithm is in key 3
  // For simplicity, we'll detect ES256 (-7) or RS256 (-257) based on common patterns
  let algorithm = -7; // Default to ES256

  // Check for RS256 indicator (0xa5 = 5 element map with RSA markers)
  if (publicKey[0] === 0xa5) {
    // Check for RSA key type (kty = 3)
    if (publicKey.includes(0x03) && publicKey.length > 256) {
      algorithm = -257;
    }
  }

  return {
    publicKey,
    algorithm,
    aaguid: aaguidHex,
  };
}

/**
 * Check if WebAuthn error is a user cancellation
 */
export function isUserCancellation(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();

    return (
      name === "notallowederror" ||
      name === "aborterror" ||
      message.includes("user cancelled") ||
      message.includes("user denied") ||
      message.includes("not allowed") ||
      message.includes("aborted")
    );
  }
  return false;
}

/**
 * Check if WebAuthn error indicates credential already exists
 */
export function isCredentialExistsError(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();

    return (
      name === "invalidstateerror" ||
      message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("excludecredentials")
    );
  }
  return false;
}

/**
 * Check if WebAuthn is supported in this environment
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

/**
 * Check if platform authenticator (Face ID, Touch ID, Windows Hello) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
