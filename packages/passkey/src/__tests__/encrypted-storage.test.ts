/**
 * Tests for encrypted storage
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StoragePort } from "@aa-wallet/types";
import { WebCryptoAdapter } from "../storage/crypto";
import { EncryptedStoragePort } from "../storage/encrypted-storage";

// Mock storage implementation
function createMockStorage(): StoragePort {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null) as StoragePort["get"],
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }) as StoragePort["set"],
    remove: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  };
}

describe("WebCryptoAdapter", () => {
  let crypto: WebCryptoAdapter;

  beforeEach(() => {
    crypto = new WebCryptoAdapter();
  });

  it("should encrypt and decrypt data", async () => {
    const data = new TextEncoder().encode("Hello, World!");
    const secret = "test-secret";

    const encrypted = await crypto.encrypt(data, secret);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();
    expect(encrypted.ciphertext).not.toBe("");

    const decrypted = await crypto.decrypt(encrypted, secret);
    const decryptedText = new TextDecoder().decode(decrypted);

    expect(decryptedText).toBe("Hello, World!");
  });

  it("should fail to decrypt with wrong secret", async () => {
    const data = new TextEncoder().encode("Secret data");
    const encrypted = await crypto.encrypt(data, "correct-secret");

    await expect(crypto.decrypt(encrypted, "wrong-secret")).rejects.toThrow();
  });

  it("should generate random bytes of specified length", () => {
    const bytes16 = crypto.generateRandomBytes(16);
    const bytes32 = crypto.generateRandomBytes(32);

    expect(bytes16.length).toBe(16);
    expect(bytes32.length).toBe(32);

    // Should be different each time
    const bytes16b = crypto.generateRandomBytes(16);
    expect(bytes16).not.toEqual(bytes16b);
  });
});

describe("EncryptedStoragePort", () => {
  let mockStorage: StoragePort;
  let encryptedStorage: EncryptedStoragePort;
  const secret = "test-encryption-secret";

  beforeEach(() => {
    mockStorage = createMockStorage();
    encryptedStorage = new EncryptedStoragePort({
      storage: mockStorage,
      secretProvider: () => secret,
    });
  });

  it("should encrypt data when storing", async () => {
    const data = { name: "test", value: 123 };
    await encryptedStorage.set("key", data);

    expect(mockStorage.set).toHaveBeenCalledWith(
      "key",
      expect.objectContaining({
        ciphertext: expect.any(String),
        iv: expect.any(String),
        salt: expect.any(String),
      })
    );
  });

  it("should decrypt data when retrieving", async () => {
    const data = { name: "test", value: 123 };
    await encryptedStorage.set("key", data);

    const retrieved = await encryptedStorage.get<typeof data>("key");

    expect(retrieved).toEqual(data);
  });

  it("should return null for non-existent key", async () => {
    const result = await encryptedStorage.get("non-existent");
    expect(result).toBeNull();
  });

  it("should handle async secret provider", async () => {
    const asyncStorage = new EncryptedStoragePort({
      storage: mockStorage,
      secretProvider: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return secret;
      },
    });

    const data = { test: true };
    await asyncStorage.set("key", data);
    const retrieved = await asyncStorage.get<typeof data>("key");

    expect(retrieved).toEqual(data);
  });

  it("should remove data", async () => {
    await encryptedStorage.set("key", { data: true });
    await encryptedStorage.remove("key");

    expect(mockStorage.remove).toHaveBeenCalledWith("key");
  });

  it("should clear all data", async () => {
    await encryptedStorage.set("key1", { data: 1 });
    await encryptedStorage.set("key2", { data: 2 });
    await encryptedStorage.clear();

    expect(mockStorage.clear).toHaveBeenCalled();
  });

  it("should return null for corrupted data", async () => {
    // Manually set invalid encrypted data
    await mockStorage.set("corrupted", {
      ciphertext: "invalid-base64!!!",
      iv: "invalid",
      salt: "invalid",
    });

    const result = await encryptedStorage.get("corrupted");
    expect(result).toBeNull();
  });
});
