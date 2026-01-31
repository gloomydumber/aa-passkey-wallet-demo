/**
 * Internal types for @aa-wallet/passkey
 *
 * Note: WebAuthn-related types have been removed as WebAuthn operations
 * are now handled by viem's account-abstraction utilities.
 */

import type { PasskeyCredential, SessionState } from "@aa-wallet/types";

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
export type { PasskeyCredential, SessionState };
