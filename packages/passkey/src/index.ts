/**
 * @aa-wallet/passkey
 *
 * Credential storage and session management for AA Wallet.
 *
 * Note: WebAuthn operations (registration/authentication) should be performed
 * using viem's account-abstraction utilities:
 * - createWebAuthnCredential() for registration
 * - toWebAuthnAccount() for creating a signer
 *
 * This package provides:
 * - Credential storage (encrypted)
 * - Session management (timeouts, activity tracking)
 * - Event system for UI updates
 */

// Main service
export { PasskeyService } from "./passkey-service";
export type { PasskeyServiceConfig } from "./passkey-service";

// Storage
export {
  WebCryptoAdapter,
  generateChallenge,
  generateUserId,
  EncryptedStoragePort,
  CredentialStore,
} from "./storage";
export type { SecretProvider, EncryptedStorageConfig } from "./storage";

// Session
export { SessionManager } from "./session";
export type { SessionExpirationCallback } from "./session";

// Types
export type {
  CryptoAdapter,
  EncryptedData,
  SessionConfig,
  StoredSession,
  PasskeyServiceEvent,
  PasskeyEventListener,
  // Re-exported from @aa-wallet/types
  PasskeyCredential,
  SessionState,
} from "./types";
