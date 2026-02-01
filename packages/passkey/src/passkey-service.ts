/**
 * PasskeyService - Session and credential storage management
 *
 * Note: WebAuthn operations (registration/authentication) have been moved to
 * the core package using viem's account-abstraction utilities.
 * This service now focuses on:
 * - Credential storage (CRUD operations)
 * - Session management (login state, timeouts)
 * - Event emission for UI updates
 */

import type { StoragePort } from "@aa-wallet/types";
import type {
  PasskeyCredential,
  SessionState,
  SessionConfig,
  PasskeyServiceEvent,
  PasskeyEventListener,
} from "./types";
import { CredentialStore } from "./storage/credential-store";
import { SessionManager, type SessionExpirationCallback } from "./session/session-manager";

/**
 * Configuration for PasskeyService
 */
export interface PasskeyServiceConfig {
  /** Session configuration (optional) */
  session?: Partial<SessionConfig>;
  /** Storage adapter for credentials and session */
  storage: StoragePort;
}

/**
 * Service for credential storage and session management
 *
 * WebAuthn operations should be performed using viem's account-abstraction:
 * - createWebAuthnCredential() for registration
 * - toWebAuthnAccount() for creating a signer
 *
 * After WebAuthn operations, use this service to:
 * - Store credentials (saveCredential)
 * - Manage sessions (startSession, endSession)
 * - Track session state
 */
export class PasskeyService {
  private credentialStore: CredentialStore;
  private sessionManager: SessionManager;
  private eventListeners: Set<PasskeyEventListener> = new Set();
  private initialized = false;

  constructor(config: PasskeyServiceConfig) {
    this.credentialStore = new CredentialStore(config.storage);
    this.sessionManager = new SessionManager(
      config.storage,
      config.session,
      this.handleSessionExpiration.bind(this)
    );
  }

  /**
   * Initialize the service (restore existing session if valid)
   */
  async initialize(): Promise<SessionState | null> {
    if (this.initialized) {
      return this.sessionManager.getSession();
    }

    const session = await this.sessionManager.initialize();
    this.initialized = true;
    return session;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.sessionManager.destroy();
    this.eventListeners.clear();
    this.initialized = false;
  }

  // ============================================
  // Credential Management
  // ============================================

  /**
   * Save a credential after WebAuthn registration
   *
   * @example
   * ```typescript
   * // After viem's createWebAuthnCredential()
   * const viemCredential = await createWebAuthnCredential({ name: 'My Wallet' });
   *
   * // Save to storage
   * await passkeyService.saveCredential({
   *   id: viemCredential.id,
   *   publicKey: serializePublicKey(viemCredential.publicKey),
   *   name: 'My Wallet',
   *   createdAt: Date.now(),
   * });
   * ```
   */
  async saveCredential(credential: PasskeyCredential): Promise<void> {
    await this.credentialStore.saveCredential(credential);
    this.emit({ type: "credential_registered", credential });
  }

  /**
   * Get all stored credentials
   */
  async getCredentials(): Promise<PasskeyCredential[]> {
    return this.credentialStore.getAllCredentials();
  }

  /**
   * Get credentials sorted by last used (most recent first)
   * Falls back to createdAt if lastUsedAt is not set
   */
  async getCredentialsSortedByLastUsed(): Promise<PasskeyCredential[]> {
    return this.credentialStore.getCredentialsSortedByLastUsed();
  }

  /**
   * Get the active credential
   */
  async getActiveCredential(): Promise<PasskeyCredential | null> {
    return this.credentialStore.getActiveCredential();
  }

  /**
   * Get a credential by ID
   */
  async getCredential(credentialId: string): Promise<PasskeyCredential | null> {
    return this.credentialStore.getCredential(credentialId);
  }

  /**
   * Remove a credential
   */
  async removeCredential(credentialId: string): Promise<boolean> {
    const removed = await this.credentialStore.removeCredential(credentialId);
    if (removed) {
      this.emit({ type: "credential_removed", credentialId });
    }
    return removed;
  }

  /**
   * Check if any credentials are stored
   */
  async hasCredentials(): Promise<boolean> {
    return this.credentialStore.hasCredentials();
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Start a session after successful WebAuthn authentication
   *
   * @example
   * ```typescript
   * // After viem's WebAuthn sign operation succeeds
   * const session = await passkeyService.startSession(credentialId);
   * ```
   */
  async startSession(credentialId: string): Promise<SessionState> {
    // Set the authenticated credential as active
    await this.credentialStore.setActiveCredential(credentialId);

    // Update last used timestamp for credential sorting
    await this.credentialStore.updateLastUsedAt(credentialId);

    // Start session
    const session = await this.sessionManager.startSession(credentialId);

    this.emit({ type: "session_started", credentialId });

    return session;
  }

  /**
   * Log out and end session
   */
  async logout(): Promise<void> {
    await this.sessionManager.endSession();
    await this.credentialStore.clearActiveCredential();

    this.emit({ type: "session_ended", reason: "logout" });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return this.sessionManager.isAuthenticated();
  }

  /**
   * Get current session state
   */
  async getSession(): Promise<SessionState | null> {
    return this.sessionManager.getSession();
  }

  /**
   * Record user activity to prevent inactivity timeout
   */
  async recordActivity(): Promise<void> {
    return this.sessionManager.recordActivity();
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Add event listener
   */
  addEventListener(listener: PasskeyEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: PasskeyEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emit(event: PasskeyServiceEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private handleSessionExpiration: SessionExpirationCallback = (reason) => {
    this.credentialStore.clearActiveCredential();
    this.emit({ type: "session_ended", reason });
  };
}
