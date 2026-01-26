/**
 * Passkey/WebAuthn types for AA Passkey Wallet
 */

export interface PasskeyCredential {
  /** Credential ID (base64url encoded) */
  id: string;
  /** Raw credential ID (Uint8Array as base64) */
  rawId: string;
  /** Public key (COSE format, base64 encoded) */
  publicKey: string;
  /** Public key algorithm */
  algorithm: number;
  /** Credential creation timestamp */
  createdAt: number;
  /** User-friendly name for the credential */
  name?: string;
  /** Authenticator AAGUID */
  aaguid?: string;
}

export interface PasskeyChallenge {
  /** Challenge value (base64url encoded) */
  challenge: string;
  /** Challenge expiration timestamp */
  expiresAt: number;
}

export interface PasskeyRegistrationOptions {
  /** Relying party info */
  rp: {
    name: string;
    id: string;
  };
  /** User info */
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  /** Challenge */
  challenge: string;
  /** Public key credential parameters */
  pubKeyCredParams: Array<{
    type: "public-key";
    alg: number;
  }>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Authenticator selection criteria */
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    residentKey?: "required" | "preferred" | "discouraged";
    userVerification?: "required" | "preferred" | "discouraged";
  };
  /** Attestation preference */
  attestation?: "none" | "indirect" | "direct" | "enterprise";
}

export interface PasskeyAuthenticationOptions {
  /** Challenge */
  challenge: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Relying party ID */
  rpId: string;
  /** Allowed credentials */
  allowCredentials?: Array<{
    type: "public-key";
    id: string;
    transports?: Array<"usb" | "nfc" | "ble" | "internal" | "hybrid">;
  }>;
  /** User verification requirement */
  userVerification?: "required" | "preferred" | "discouraged";
}

export interface PasskeySignature {
  /** Authenticator data (base64 encoded) */
  authenticatorData: string;
  /** Client data JSON (base64 encoded) */
  clientDataJSON: string;
  /** Signature (base64 encoded) */
  signature: string;
  /** User handle (base64 encoded, optional) */
  userHandle?: string;
}

export interface SessionState {
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Session expiration timestamp */
  expiresAt: number | null;
  /** Active credential ID */
  activeCredentialId: string | null;
  /** Last activity timestamp */
  lastActivity: number;
}
