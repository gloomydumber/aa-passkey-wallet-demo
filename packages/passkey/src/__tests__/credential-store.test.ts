/**
 * Tests for credential store
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StorageAdapter } from "@aa-wallet/types";
import type { PasskeyCredential } from "../types";
import { CredentialStore } from "../storage/credential-store";

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

function createMockCredential(id: string, name?: string): PasskeyCredential {
  return {
    id,
    rawId: `raw-${id}`,
    publicKey: `public-key-${id}`,
    algorithm: -7,
    createdAt: Date.now(),
    name,
    aaguid: "00000000-0000-0000-0000-000000000000",
  };
}

describe("CredentialStore", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let store: CredentialStore;

  beforeEach(() => {
    mockStorage = createMockStorage();
    store = new CredentialStore(mockStorage);
  });

  describe("saveCredential", () => {
    it("should save a new credential", async () => {
      const credential = createMockCredential("cred-1", "My Passkey");
      await store.saveCredential(credential);

      const credentials = await store.getAllCredentials();
      expect(credentials).toHaveLength(1);
      expect(credentials[0]).toEqual(credential);
    });

    it("should update existing credential with same ID", async () => {
      const credential1 = createMockCredential("cred-1", "Original");
      const credential2 = createMockCredential("cred-1", "Updated");

      await store.saveCredential(credential1);
      await store.saveCredential(credential2);

      const credentials = await store.getAllCredentials();
      expect(credentials).toHaveLength(1);
      expect(credentials[0]!.name).toBe("Updated");
    });

    it("should save multiple credentials", async () => {
      await store.saveCredential(createMockCredential("cred-1"));
      await store.saveCredential(createMockCredential("cred-2"));
      await store.saveCredential(createMockCredential("cred-3"));

      const credentials = await store.getAllCredentials();
      expect(credentials).toHaveLength(3);
    });
  });

  describe("getAllCredentials", () => {
    it("should return empty array when no credentials", async () => {
      const credentials = await store.getAllCredentials();
      expect(credentials).toEqual([]);
    });

    it("should return all saved credentials", async () => {
      await store.saveCredential(createMockCredential("cred-1"));
      await store.saveCredential(createMockCredential("cred-2"));

      const credentials = await store.getAllCredentials();
      expect(credentials).toHaveLength(2);
      expect(credentials.map((c) => c.id)).toEqual(["cred-1", "cred-2"]);
    });
  });

  describe("getCredential", () => {
    it("should return credential by ID", async () => {
      const credential = createMockCredential("cred-1", "Test");
      await store.saveCredential(credential);

      const retrieved = await store.getCredential("cred-1");
      expect(retrieved).toEqual(credential);
    });

    it("should return null for non-existent ID", async () => {
      const retrieved = await store.getCredential("non-existent");
      expect(retrieved).toBeNull();
    });
  });

  describe("removeCredential", () => {
    it("should remove credential by ID", async () => {
      await store.saveCredential(createMockCredential("cred-1"));
      await store.saveCredential(createMockCredential("cred-2"));

      const removed = await store.removeCredential("cred-1");

      expect(removed).toBe(true);
      const credentials = await store.getAllCredentials();
      expect(credentials).toHaveLength(1);
      expect(credentials[0]!.id).toBe("cred-2");
    });

    it("should return false for non-existent credential", async () => {
      const removed = await store.removeCredential("non-existent");
      expect(removed).toBe(false);
    });

    it("should clear active credential if removed", async () => {
      await store.saveCredential(createMockCredential("cred-1"));
      await store.setActiveCredential("cred-1");

      await store.removeCredential("cred-1");

      const activeId = await store.getActiveCredentialId();
      expect(activeId).toBeNull();
    });
  });

  describe("active credential", () => {
    it("should set and get active credential ID", async () => {
      await store.saveCredential(createMockCredential("cred-1"));
      await store.setActiveCredential("cred-1");

      const activeId = await store.getActiveCredentialId();
      expect(activeId).toBe("cred-1");
    });

    it("should return null when no active credential", async () => {
      const activeId = await store.getActiveCredentialId();
      expect(activeId).toBeNull();
    });

    it("should get active credential object", async () => {
      const credential = createMockCredential("cred-1", "Test");
      await store.saveCredential(credential);
      await store.setActiveCredential("cred-1");

      const active = await store.getActiveCredential();
      expect(active).toEqual(credential);
    });

    it("should clear active credential", async () => {
      await store.saveCredential(createMockCredential("cred-1"));
      await store.setActiveCredential("cred-1");
      await store.clearActiveCredential();

      const activeId = await store.getActiveCredentialId();
      expect(activeId).toBeNull();
    });
  });

  describe("hasCredentials", () => {
    it("should return false when no credentials", async () => {
      const has = await store.hasCredentials();
      expect(has).toBe(false);
    });

    it("should return true when credentials exist", async () => {
      await store.saveCredential(createMockCredential("cred-1"));

      const has = await store.hasCredentials();
      expect(has).toBe(true);
    });
  });

  describe("clearAllCredentials", () => {
    it("should clear all credentials and active credential", async () => {
      await store.saveCredential(createMockCredential("cred-1"));
      await store.saveCredential(createMockCredential("cred-2"));
      await store.setActiveCredential("cred-1");

      await store.clearAllCredentials();

      const credentials = await store.getAllCredentials();
      const activeId = await store.getActiveCredentialId();

      expect(credentials).toEqual([]);
      expect(activeId).toBeNull();
    });
  });
});
