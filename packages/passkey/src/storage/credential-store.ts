/**
 * Credential store for managing passkey credentials
 */

import type { StorageAdapter } from "@aa-wallet/types";
import type { PasskeyCredential } from "../types";

const CREDENTIALS_KEY = "passkey_credentials";
const ACTIVE_CREDENTIAL_KEY = "active_credential_id";

/**
 * Store for managing passkey credentials
 */
export class CredentialStore {
  constructor(private storage: StorageAdapter) {}

  /**
   * Save a new credential
   */
  async saveCredential(credential: PasskeyCredential): Promise<void> {
    const credentials = await this.getAllCredentials();

    // Check if credential already exists
    const existingIndex = credentials.findIndex((c) => c.id === credential.id);
    if (existingIndex >= 0) {
      // Update existing credential
      credentials[existingIndex] = credential;
    } else {
      // Add new credential
      credentials.push(credential);
    }

    await this.storage.set(CREDENTIALS_KEY, credentials);
  }

  /**
   * Get all stored credentials
   */
  async getAllCredentials(): Promise<PasskeyCredential[]> {
    const credentials = await this.storage.get<PasskeyCredential[]>(CREDENTIALS_KEY);
    return credentials ?? [];
  }

  /**
   * Get a credential by ID
   */
  async getCredential(id: string): Promise<PasskeyCredential | null> {
    const credentials = await this.getAllCredentials();
    return credentials.find((c) => c.id === id) ?? null;
  }

  /**
   * Remove a credential by ID
   */
  async removeCredential(id: string): Promise<boolean> {
    const credentials = await this.getAllCredentials();
    const filtered = credentials.filter((c) => c.id !== id);

    if (filtered.length === credentials.length) {
      return false; // Credential not found
    }

    await this.storage.set(CREDENTIALS_KEY, filtered);

    // Clear active credential if it was removed
    const activeId = await this.getActiveCredentialId();
    if (activeId === id) {
      await this.clearActiveCredential();
    }

    return true;
  }

  /**
   * Set the active credential ID
   */
  async setActiveCredential(id: string): Promise<void> {
    await this.storage.set(ACTIVE_CREDENTIAL_KEY, id);
  }

  /**
   * Get the active credential ID
   */
  async getActiveCredentialId(): Promise<string | null> {
    return this.storage.get<string>(ACTIVE_CREDENTIAL_KEY);
  }

  /**
   * Get the active credential
   */
  async getActiveCredential(): Promise<PasskeyCredential | null> {
    const id = await this.getActiveCredentialId();
    if (!id) {
      return null;
    }
    return this.getCredential(id);
  }

  /**
   * Clear the active credential
   */
  async clearActiveCredential(): Promise<void> {
    await this.storage.remove(ACTIVE_CREDENTIAL_KEY);
  }

  /**
   * Check if any credentials are stored
   */
  async hasCredentials(): Promise<boolean> {
    const credentials = await this.getAllCredentials();
    return credentials.length > 0;
  }

  /**
   * Clear all credentials
   */
  async clearAllCredentials(): Promise<void> {
    await this.storage.remove(CREDENTIALS_KEY);
    await this.clearActiveCredential();
  }
}
