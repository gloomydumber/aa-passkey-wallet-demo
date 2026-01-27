/**
 * @aa-wallet/passkey
 *
 * Passkey (WebAuthn) authentication package for AA Wallet
 */

// Main service
export { PasskeyService } from "./passkey-service";
export type { PasskeyServiceConfig } from "./passkey-service";

// WebAuthn functions
export {
  buildRegistrationOptions,
  startRegistration,
  registerPasskey,
  buildAuthenticationOptions,
  startAuthentication,
  authenticatePasskey,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isUserCancellation,
  isCredentialExistsError,
} from "./webauthn";

// Storage
export {
  WebCryptoAdapter,
  generateChallenge,
  generateUserId,
  EncryptedStorageAdapter,
  CredentialStore,
} from "./storage";
export type { SecretProvider, EncryptedStorageConfig } from "./storage";

// Session
export { SessionManager } from "./session";
export type { SessionExpirationCallback } from "./session";

// Types
export type {
  RegistrationResponse,
  AuthenticationResponse,
  WebAuthnAdapter,
  CryptoAdapter,
  EncryptedData,
  PasskeyConfig,
  SessionConfig,
  StoredSession,
  UserInfo,
  PasskeyServiceEvent,
  PasskeyEventListener,
  // Re-exported from @aa-wallet/types
  PasskeyCredential,
  PasskeyRegistrationOptions,
  PasskeyAuthenticationOptions,
  PasskeySignature,
  SessionState,
} from "./types";
