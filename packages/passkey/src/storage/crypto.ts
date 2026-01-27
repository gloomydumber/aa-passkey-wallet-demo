/**
 * WebCrypto utilities for AES-GCM encryption
 */

import { uint8ArrayToBase64, base64ToUint8Array } from "@aa-wallet/utils";
import type { CryptoAdapter, EncryptedData } from "../types";

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

/**
 * WebCrypto-based encryption adapter using AES-GCM
 */
export class WebCryptoAdapter implements CryptoAdapter {
  /**
   * Encrypt data using AES-GCM with PBKDF2 key derivation
   */
  async encrypt(data: Uint8Array, secret: string): Promise<EncryptedData> {
    const salt = this.generateRandomBytes(SALT_LENGTH);
    const iv = this.generateRandomBytes(IV_LENGTH);
    const key = await this.deriveKey(secret, salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      data.buffer as ArrayBuffer
    );

    return {
      ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertext)),
      iv: uint8ArrayToBase64(iv),
      salt: uint8ArrayToBase64(salt),
    };
  }

  /**
   * Decrypt data using AES-GCM with PBKDF2 key derivation
   */
  async decrypt(encrypted: EncryptedData, secret: string): Promise<Uint8Array> {
    const salt = base64ToUint8Array(encrypted.salt);
    const iv = base64ToUint8Array(encrypted.iv);
    const ciphertext = base64ToUint8Array(encrypted.ciphertext);
    const key = await this.deriveKey(secret, salt);

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    return new Uint8Array(plaintext);
  }

  /**
   * Generate cryptographically secure random bytes
   */
  generateRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  /**
   * Derive an AES key from a password using PBKDF2
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      "raw",
      passwordBuffer.buffer as ArrayBuffer,
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt.buffer as ArrayBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: KEY_LENGTH },
      false,
      ["encrypt", "decrypt"]
    );
  }
}

/**
 * Generate a random challenge for WebAuthn
 */
export function generateChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return uint8ArrayToBase64(bytes);
}

/**
 * Generate a random user ID for WebAuthn
 */
export function generateUserId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return uint8ArrayToBase64(bytes);
}
