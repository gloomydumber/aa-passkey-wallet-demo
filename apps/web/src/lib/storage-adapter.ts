/**
 * Browser Storage Adapter
 *
 * Implements StoragePort using localStorage for browser environments.
 */

import type { StoragePort } from "@aa-wallet/types";

const STORAGE_PREFIX = "aa-wallet:";

export class BrowserStorageAdapter implements StoragePort {
  async get<T>(key: string): Promise<T | null> {
    if (typeof window === "undefined") return null;

    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof window === "undefined") return;

    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    if (typeof window === "undefined") return;

    localStorage.removeItem(STORAGE_PREFIX + key);
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

/** Singleton instance for use across the app */
let storageInstance: BrowserStorageAdapter | null = null;

export function getStorageAdapter(): BrowserStorageAdapter {
  if (!storageInstance) {
    storageInstance = new BrowserStorageAdapter();
  }
  return storageInstance;
}
