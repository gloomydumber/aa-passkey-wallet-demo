/**
 * Encrypted storage adapter that wraps any StorageAdapter
 */

import type { StorageAdapter } from "@aa-wallet/types";
import { stringToUint8Array, uint8ArrayToString } from "@aa-wallet/utils";
import type { CryptoAdapter, EncryptedData } from "../types";
import { WebCryptoAdapter } from "./crypto";

/**
 * Type for secret provider function
 */
export type SecretProvider = () => string | Promise<string>;

/**
 * Encrypted storage adapter configuration
 */
export interface EncryptedStorageConfig {
  /** Underlying storage adapter */
  storage: StorageAdapter;
  /** Secret provider for encryption key derivation */
  secretProvider: SecretProvider;
  /** Optional crypto adapter (defaults to WebCryptoAdapter) */
  cryptoAdapter?: CryptoAdapter;
}

/**
 * Storage adapter that encrypts data before storing
 */
export class EncryptedStorageAdapter implements StorageAdapter {
  private storage: StorageAdapter;
  private secretProvider: SecretProvider;
  private cryptoAdapter: CryptoAdapter;

  constructor(config: EncryptedStorageConfig) {
    this.storage = config.storage;
    this.secretProvider = config.secretProvider;
    this.cryptoAdapter = config.cryptoAdapter ?? new WebCryptoAdapter();
  }

  /**
   * Get and decrypt a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    const encrypted = await this.storage.get<EncryptedData>(key);
    if (!encrypted) {
      return null;
    }

    try {
      const secret = await this.secretProvider();
      const decrypted = await this.cryptoAdapter.decrypt(encrypted, secret);
      const json = uint8ArrayToString(decrypted);
      return JSON.parse(json) as T;
    } catch {
      // If decryption fails, the data may be corrupted or the secret changed
      return null;
    }
  }

  /**
   * Encrypt and store a value
   */
  async set<T>(key: string, value: T): Promise<void> {
    const secret = await this.secretProvider();
    const json = JSON.stringify(value);
    const data = stringToUint8Array(json);
    const encrypted = await this.cryptoAdapter.encrypt(data, secret);
    await this.storage.set(key, encrypted);
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    await this.storage.remove(key);
  }

  /**
   * Clear all values from storage
   */
  async clear(): Promise<void> {
    await this.storage.clear();
  }
}
