/**
 * Session manager with auto-logout on inactivity
 */

import type { StorageAdapter } from "@aa-wallet/types";
import type { SessionState, SessionConfig, StoredSession } from "../types";

const SESSION_KEY = "passkey_session";
const DEFAULT_MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const DEFAULT_INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Callback for session expiration events
 */
export type SessionExpirationCallback = (reason: "expired" | "inactivity") => void;

/**
 * Session manager for handling authentication state with auto-logout
 */
export class SessionManager {
  private config: SessionConfig;
  private storage: StorageAdapter;
  private expirationCallback?: SessionExpirationCallback;
  private inactivityTimer?: ReturnType<typeof setTimeout>;
  private sessionTimer?: ReturnType<typeof setTimeout>;

  constructor(
    storage: StorageAdapter,
    config?: Partial<SessionConfig>,
    onExpiration?: SessionExpirationCallback
  ) {
    this.storage = storage;
    this.config = {
      maxSessionDuration: config?.maxSessionDuration ?? DEFAULT_MAX_SESSION_DURATION,
      inactivityTimeout: config?.inactivityTimeout ?? DEFAULT_INACTIVITY_TIMEOUT,
    };
    this.expirationCallback = onExpiration;
  }

  /**
   * Start a new session
   */
  async startSession(credentialId: string): Promise<SessionState> {
    const now = Date.now();
    const expiresAt = now + this.config.maxSessionDuration;

    const session: StoredSession = {
      createdAt: now,
      expiresAt,
      lastActivity: now,
      activeCredentialId: credentialId,
    };

    await this.storage.set(SESSION_KEY, session);

    // Set up auto-logout timers
    this.setupTimers(session);

    return this.toSessionState(session);
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    this.clearTimers();
    await this.storage.remove(SESSION_KEY);
  }

  /**
   * Get the current session state
   * Returns null if no session or session is expired
   */
  async getSession(): Promise<SessionState | null> {
    const session = await this.storage.get<StoredSession>(SESSION_KEY);
    if (!session) {
      return null;
    }

    const now = Date.now();

    // Check if session has expired
    if (now > session.expiresAt) {
      await this.endSession();
      this.expirationCallback?.("expired");
      return null;
    }

    // Check if session has been inactive
    const inactivityExpiry = session.lastActivity + this.config.inactivityTimeout;
    if (now > inactivityExpiry) {
      await this.endSession();
      this.expirationCallback?.("inactivity");
      return null;
    }

    return this.toSessionState(session);
  }

  /**
   * Check if there is an active session
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null && session.isAuthenticated;
  }

  /**
   * Record user activity to reset inactivity timer
   */
  async recordActivity(): Promise<void> {
    const session = await this.storage.get<StoredSession>(SESSION_KEY);
    if (!session) {
      return;
    }

    const now = Date.now();

    // Don't extend past the absolute expiration
    if (now > session.expiresAt) {
      await this.endSession();
      this.expirationCallback?.("expired");
      return;
    }

    const updatedSession: StoredSession = {
      ...session,
      lastActivity: now,
    };

    await this.storage.set(SESSION_KEY, updatedSession);

    // Reset inactivity timer
    this.setupInactivityTimer(updatedSession);
  }

  /**
   * Get time remaining until session expires (in milliseconds)
   */
  async getTimeRemaining(): Promise<number> {
    const session = await this.getSession();
    if (!session || !session.expiresAt) {
      return 0;
    }
    return Math.max(0, session.expiresAt - Date.now());
  }

  /**
   * Set the expiration callback
   */
  setExpirationCallback(callback: SessionExpirationCallback): void {
    this.expirationCallback = callback;
  }

  /**
   * Initialize timers for an existing session
   * Call this when the app starts if a session may already exist
   */
  async initialize(): Promise<SessionState | null> {
    const session = await this.storage.get<StoredSession>(SESSION_KEY);
    if (!session) {
      return null;
    }

    // Validate session
    const now = Date.now();
    if (now > session.expiresAt) {
      await this.endSession();
      return null;
    }

    const inactivityExpiry = session.lastActivity + this.config.inactivityTimeout;
    if (now > inactivityExpiry) {
      await this.endSession();
      return null;
    }

    // Session is valid, set up timers
    this.setupTimers(session);
    return this.toSessionState(session);
  }

  /**
   * Clean up timers
   */
  destroy(): void {
    this.clearTimers();
  }

  private setupTimers(session: StoredSession): void {
    this.clearTimers();
    this.setupSessionTimer(session);
    this.setupInactivityTimer(session);
  }

  private setupSessionTimer(session: StoredSession): void {
    const timeUntilExpiry = session.expiresAt - Date.now();
    if (timeUntilExpiry > 0) {
      this.sessionTimer = setTimeout(async () => {
        await this.endSession();
        this.expirationCallback?.("expired");
      }, timeUntilExpiry);
    }
  }

  private setupInactivityTimer(session: StoredSession): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    const timeUntilInactivity =
      session.lastActivity + this.config.inactivityTimeout - Date.now();
    if (timeUntilInactivity > 0) {
      this.inactivityTimer = setTimeout(async () => {
        await this.endSession();
        this.expirationCallback?.("inactivity");
      }, timeUntilInactivity);
    }
  }

  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = undefined;
    }
  }

  private toSessionState(session: StoredSession): SessionState {
    return {
      isAuthenticated: true,
      expiresAt: session.expiresAt,
      activeCredentialId: session.activeCredentialId,
      lastActivity: session.lastActivity,
    };
  }
}
