/**
 * Internal types for @aa-wallet/passkey
 */

import type {
  PasskeyCredential,
  PasskeyRegistrationOptions,
  PasskeyAuthenticationOptions,
  PasskeySignature,
  SessionState,
} from "@aa-wallet/types";

/**
 * Response from WebAuthn registration
 */
export interface RegistrationResponse {
  credential: PasskeyCredential;
  attestationObject: string;
  clientDataJSON: string;
}

/**
 * Response from WebAuthn authentication
 */
export interface AuthenticationResponse {
  credentialId: string;
  signature: PasskeySignature;
}

/**
 * Platform abstraction for WebAuthn operations
 */
export interface WebAuthnAdapter {
  /** Check if WebAuthn is supported */
  isSupported(): boolean;
  /** Check if platform authenticator is available */
  isPlatformAuthenticatorAvailable(): Promise<boolean>;
  /** Start registration ceremony */
  startRegistration(options: PasskeyRegistrationOptions): Promise<RegistrationResponse>;
  /** Start authentication ceremony */
  startAuthentication(options: PasskeyAuthenticationOptions): Promise<AuthenticationResponse>;
}

/**
 * Encryption adapter interface for platform abstraction
 */
export interface CryptoAdapter {
  /** Encrypt data with a key derived from secret */
  encrypt(data: Uint8Array, secret: string): Promise<EncryptedData>;
  /** Decrypt data with a key derived from secret */
  decrypt(encrypted: EncryptedData, secret: string): Promise<Uint8Array>;
  /** Generate random bytes */
  generateRandomBytes(length: number): Uint8Array;
}

/**
 * Structure for encrypted data
 */
export interface EncryptedData {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded salt for key derivation */
  salt: string;
}

/**
 * Configuration for passkey service
 */
export interface PasskeyConfig {
  /** Relying party ID (usually domain) */
  rpId: string;
  /** Relying party name (displayed to user) */
  rpName: string;
  /** Timeout for WebAuthn operations in milliseconds */
  timeout?: number;
  /** Authenticator attachment preference */
  authenticatorAttachment?: "platform" | "cross-platform";
  /** Whether to require resident key */
  residentKey?: "required" | "preferred" | "discouraged";
  /** User verification requirement */
  userVerification?: "required" | "preferred" | "discouraged";
}

/**
 * Configuration for session management
 */
export interface SessionConfig {
  /** Maximum session duration in milliseconds (default: 30 minutes) */
  maxSessionDuration: number;
  /** Inactivity timeout in milliseconds (default: 5 minutes) */
  inactivityTimeout: number;
}

/**
 * Stored session data
 */
export interface StoredSession {
  /** Session creation timestamp */
  createdAt: number;
  /** Session expiration timestamp */
  expiresAt: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Active credential ID */
  activeCredentialId: string;
}

/**
 * User information for registration
 */
export interface UserInfo {
  /** User ID (should be unique, opaque identifier) */
  id: string;
  /** User name (e.g., email) */
  name: string;
  /** Display name */
  displayName: string;
}

/**
 * Events emitted by PasskeyService
 */
export type PasskeyServiceEvent =
  | { type: "session_started"; credentialId: string }
  | { type: "session_ended"; reason: "logout" | "expired" | "inactivity" }
  | { type: "credential_registered"; credential: PasskeyCredential }
  | { type: "credential_removed"; credentialId: string };

/**
 * Event listener type
 */
export type PasskeyEventListener = (event: PasskeyServiceEvent) => void;

// Re-export types from @aa-wallet/types for convenience
export type {
  PasskeyCredential,
  PasskeyRegistrationOptions,
  PasskeyAuthenticationOptions,
  PasskeySignature,
  SessionState,
};
