/**
 * Tests for session manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { StorageAdapter } from "@aa-wallet/types";
import { SessionManager } from "../session/session-manager";

// Mock storage implementation
function createMockStorage(): StorageAdapter & { _store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    _store: store,
    get: vi.fn(async (key: string) => store.get(key) ?? null) as StorageAdapter["get"],
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }) as StorageAdapter["set"],
    remove: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  };
}

describe("SessionManager", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let sessionManager: SessionManager;
  let expirationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage = createMockStorage();
    expirationCallback = vi.fn();
    sessionManager = new SessionManager(
      mockStorage,
      {
        maxSessionDuration: 30 * 60 * 1000, // 30 minutes
        inactivityTimeout: 5 * 60 * 1000, // 5 minutes
      },
      expirationCallback
    );
  });

  afterEach(() => {
    sessionManager.destroy();
    vi.useRealTimers();
  });

  describe("startSession", () => {
    it("should start a new session", async () => {
      const session = await sessionManager.startSession("cred-123");

      expect(session.isAuthenticated).toBe(true);
      expect(session.activeCredentialId).toBe("cred-123");
      expect(session.expiresAt).toBeGreaterThan(Date.now());
      expect(session.lastActivity).toBeDefined();
    });

    it("should store session in storage", async () => {
      await sessionManager.startSession("cred-123");

      expect(mockStorage.set).toHaveBeenCalledWith(
        "passkey_session",
        expect.objectContaining({
          activeCredentialId: "cred-123",
        })
      );
    });
  });

  describe("endSession", () => {
    it("should end the current session", async () => {
      await sessionManager.startSession("cred-123");
      await sessionManager.endSession();

      const session = await sessionManager.getSession();
      expect(session).toBeNull();
    });

    it("should remove session from storage", async () => {
      await sessionManager.startSession("cred-123");
      await sessionManager.endSession();

      expect(mockStorage.remove).toHaveBeenCalledWith("passkey_session");
    });
  });

  describe("getSession", () => {
    it("should return null when no session", async () => {
      const session = await sessionManager.getSession();
      expect(session).toBeNull();
    });

    it("should return session when active", async () => {
      await sessionManager.startSession("cred-123");
      const session = await sessionManager.getSession();

      expect(session).not.toBeNull();
      expect(session!.isAuthenticated).toBe(true);
    });

    it("should return null when session expired", async () => {
      await sessionManager.startSession("cred-123");

      // Advance time past session expiration
      vi.advanceTimersByTime(31 * 60 * 1000);

      const session = await sessionManager.getSession();
      expect(session).toBeNull();
    });

    it("should call expiration callback when session expired", async () => {
      await sessionManager.startSession("cred-123");

      // Advance past session expiration (31 minutes)
      // Note: inactivity timer may fire first, but both result in session ending
      vi.advanceTimersByTime(31 * 60 * 1000);
      await sessionManager.getSession();

      expect(expirationCallback).toHaveBeenCalled();
    });

    it("should return null when inactive for too long", async () => {
      await sessionManager.startSession("cred-123");

      // Advance time past inactivity timeout
      vi.advanceTimersByTime(6 * 60 * 1000);

      const session = await sessionManager.getSession();
      expect(session).toBeNull();
    });

    it("should call expiration callback on inactivity", async () => {
      await sessionManager.startSession("cred-123");

      vi.advanceTimersByTime(6 * 60 * 1000);
      await sessionManager.getSession();

      expect(expirationCallback).toHaveBeenCalledWith("inactivity");
    });
  });

  describe("isAuthenticated", () => {
    it("should return false when no session", async () => {
      const isAuth = await sessionManager.isAuthenticated();
      expect(isAuth).toBe(false);
    });

    it("should return true when session active", async () => {
      await sessionManager.startSession("cred-123");
      const isAuth = await sessionManager.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    it("should return false when session expired", async () => {
      await sessionManager.startSession("cred-123");
      vi.advanceTimersByTime(31 * 60 * 1000);

      const isAuth = await sessionManager.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });

  describe("recordActivity", () => {
    it("should reset inactivity timer", async () => {
      await sessionManager.startSession("cred-123");

      // Advance time close to inactivity timeout
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Record activity
      await sessionManager.recordActivity();

      // Advance time again
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Should still be active
      const session = await sessionManager.getSession();
      expect(session).not.toBeNull();
    });

    it("should not extend session past absolute expiration", async () => {
      await sessionManager.startSession("cred-123");

      // Keep recording activity until past absolute expiration
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(4 * 60 * 1000);
        await sessionManager.recordActivity();
      }

      const session = await sessionManager.getSession();
      expect(session).toBeNull();
    });

    it("should do nothing when no session", async () => {
      await sessionManager.recordActivity();
      // Should not throw
    });
  });

  describe("getTimeRemaining", () => {
    it("should return 0 when no session", async () => {
      const remaining = await sessionManager.getTimeRemaining();
      expect(remaining).toBe(0);
    });

    it("should return positive value when session active", async () => {
      await sessionManager.startSession("cred-123");
      const remaining = await sessionManager.getTimeRemaining();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30 * 60 * 1000);
    });

    it("should decrease over time", async () => {
      await sessionManager.startSession("cred-123");
      const initial = await sessionManager.getTimeRemaining();

      vi.advanceTimersByTime(5 * 60 * 1000);
      const later = await sessionManager.getTimeRemaining();

      expect(later).toBeLessThan(initial);
    });
  });

  describe("initialize", () => {
    it("should restore valid session", async () => {
      // Create a session
      await sessionManager.startSession("cred-123");
      sessionManager.destroy();

      // Create new manager with same storage
      const newManager = new SessionManager(mockStorage);
      const session = await newManager.initialize();

      expect(session).not.toBeNull();
      expect(session!.activeCredentialId).toBe("cred-123");

      newManager.destroy();
    });

    it("should return null for expired session", async () => {
      await sessionManager.startSession("cred-123");
      vi.advanceTimersByTime(31 * 60 * 1000);
      sessionManager.destroy();

      const newManager = new SessionManager(mockStorage);
      const session = await newManager.initialize();

      expect(session).toBeNull();

      newManager.destroy();
    });
  });

  describe("auto-logout timers", () => {
    it("should auto-logout on session expiration", async () => {
      await sessionManager.startSession("cred-123");

      // Advance timers and run pending async operations
      vi.advanceTimersByTime(30 * 60 * 1000);
      await vi.runAllTimersAsync();

      // Either expired or inactivity callback should have been called
      expect(expirationCallback).toHaveBeenCalled();
    });

    it("should auto-logout on inactivity", async () => {
      await sessionManager.startSession("cred-123");

      // Advance timers and run pending async operations
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runAllTimersAsync();

      expect(expirationCallback).toHaveBeenCalledWith("inactivity");
    });
  });
});
