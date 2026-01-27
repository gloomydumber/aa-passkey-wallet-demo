/**
 * WebAuthn authentication implementation
 */

import {
  startAuthentication as simpleWebAuthnStartAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { PasskeyError } from "@aa-wallet/utils";
import type {
  PasskeyAuthenticationOptions,
  PasskeyCredential,
  PasskeySignature,
  AuthenticationResponse,
  PasskeyConfig,
} from "../types";
import { generateChallenge } from "../storage/crypto";
import { isUserCancellation, isWebAuthnSupported, isPlatformAuthenticatorAvailable } from "./helpers";

/**
 * Build authentication options for WebAuthn
 */
export function buildAuthenticationOptions(
  config: PasskeyConfig,
  credentials?: PasskeyCredential[]
): PasskeyAuthenticationOptions {
  return {
    challenge: generateChallenge(),
    timeout: config.timeout ?? 60000,
    rpId: config.rpId,
    allowCredentials: credentials?.map((c) => ({
      type: "public-key" as const,
      id: c.id,
      transports: ["internal", "hybrid"] as const,
    })),
    userVerification: config.userVerification ?? "required",
  };
}

/**
 * Convert PasskeyAuthenticationOptions to SimpleWebAuthn format
 */
function toSimpleWebAuthnOptions(
  options: PasskeyAuthenticationOptions
): PublicKeyCredentialRequestOptionsJSON {
  return {
    challenge: options.challenge,
    timeout: options.timeout,
    rpId: options.rpId,
    allowCredentials: options.allowCredentials?.map((cred) => ({
      type: cred.type,
      id: cred.id,
      transports: cred.transports,
    })),
    userVerification: options.userVerification,
  };
}

/**
 * Start WebAuthn authentication ceremony
 */
export async function startAuthentication(
  options: PasskeyAuthenticationOptions
): Promise<AuthenticationResponse> {
  try {
    const simpleOptions = toSimpleWebAuthnOptions(options);
    const response = await simpleWebAuthnStartAuthentication({ optionsJSON: simpleOptions });

    const signature: PasskeySignature = {
      authenticatorData: response.response.authenticatorData,
      clientDataJSON: response.response.clientDataJSON,
      signature: response.response.signature,
      userHandle: response.response.userHandle ?? undefined,
    };

    return {
      credentialId: response.id,
      signature,
    };
  } catch (error) {
    if (isUserCancellation(error)) {
      throw new PasskeyError("Authentication cancelled by user", { cause: error });
    }
    throw new PasskeyError(
      error instanceof Error ? error.message : "Authentication failed",
      { cause: error }
    );
  }
}

/**
 * Authenticate with any available passkey
 */
export async function authenticatePasskey(
  config: PasskeyConfig,
  credentials?: PasskeyCredential[]
): Promise<AuthenticationResponse> {
  const options = buildAuthenticationOptions(config, credentials);
  return startAuthentication(options);
}

// Re-export helper functions
export { isWebAuthnSupported, isPlatformAuthenticatorAvailable };
