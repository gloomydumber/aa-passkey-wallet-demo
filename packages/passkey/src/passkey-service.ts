/**
 * High-level PasskeyService combining all passkey operations
 */

import type { StoragePort } from "@aa-wallet/types";
import type {
  PasskeyCredential,
  PasskeyConfig,
  SessionState,
  SessionConfig,
  PasskeyServiceEvent,
  PasskeyEventListener,
  RegistrationResponse,
  AuthenticationResponse,
} from "./types";
import { CredentialStore } from "./storage/credential-store";
import { SessionManager, type SessionExpirationCallback } from "./session/session-manager";
import {
  registerPasskey,
  authenticatePasskey,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
} from "./webauthn";

/**
 * Configuration for PasskeyService
 */
export interface PasskeyServiceConfig {
  /** Passkey/WebAuthn configuration */
  passkey: PasskeyConfig;
  /** Session configuration (optional) */
  session?: Partial<SessionConfig>;
  /** Storage adapter for credentials and session */
  storage: StoragePort;
}

/**
 * High-level service for passkey operations
 */
export class PasskeyService {
  private config: PasskeyConfig;
  private credentialStore: CredentialStore;
  private sessionManager: SessionManager;
  private eventListeners: Set<PasskeyEventListener> = new Set();
  private initialized = false;

  constructor(config: PasskeyServiceConfig) {
    this.config = config.passkey;
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

  /**
   * Check if WebAuthn is supported
   */
  isSupported(): boolean {
    return isWebAuthnSupported();
  }

  /**
   * Check if platform authenticator is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    return isPlatformAuthenticatorAvailable();
  }

  /**
   * Register a new passkey
   */
  async register(userName: string): Promise<PasskeyCredential> {
    const existingCredentials = await this.credentialStore.getAllCredentials();
    const existingIds = existingCredentials.map((c) => c.id);

    const response = await registerPasskey(userName, this.config, existingIds);

    // Save credential with user-provided name
    const credential: PasskeyCredential = {
      ...response.credential,
      name: userName,
    };
    await this.credentialStore.saveCredential(credential);

    this.emit({ type: "credential_registered", credential });

    return credential;
  }

  /**
   * Authenticate with a passkey and start session
   */
  async authenticate(): Promise<SessionState> {
    const credentials = await this.credentialStore.getAllCredentials();
    const response = await authenticatePasskey(
      this.config,
      credentials.length > 0 ? credentials : undefined
    );

    // Set the authenticated credential as active
    await this.credentialStore.setActiveCredential(response.credentialId);

    // Start session
    const session = await this.sessionManager.startSession(response.credentialId);

    this.emit({ type: "session_started", credentialId: response.credentialId });

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

  /**
   * Get all stored credentials
   */
  async getCredentials(): Promise<PasskeyCredential[]> {
    return this.credentialStore.getAllCredentials();
  }

  /**
   * Get the active credential
   */
  async getActiveCredential(): Promise<PasskeyCredential | null> {
    return this.credentialStore.getActiveCredential();
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
