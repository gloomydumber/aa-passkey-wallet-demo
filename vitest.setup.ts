/**
 * Vitest setup file
 *
 * Polyfills globalThis.crypto for Node.js 18 compatibility
 */

import { webcrypto } from "node:crypto";

// Polyfill globalThis.crypto if not available (Node.js 18)
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}
