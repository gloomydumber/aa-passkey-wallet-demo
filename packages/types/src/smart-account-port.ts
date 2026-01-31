/**
 * Smart Account Port - Abstract interface for smart account implementations
 *
 * This follows the Hexagonal Architecture pattern:
 * - Port = interface (this file)
 * - Adapter = concrete implementation (e.g., CoinbaseAccountAdapter in @aa-wallet/core)
 *
 * The core wallet depends only on this interface, not on specific implementations.
 */

import type { Address, Hex } from "./common";

/**
 * P256 credential from WebAuthn
 * Used as the owner/signer for the smart account
 *
 * This matches viem's P256Credential structure from createWebAuthnCredential()
 */
export interface P256Credential {
  /** Credential ID (base64url encoded) */
  id: string;
  /** P256 public key (hex encoded, uncompressed format) */
  publicKey: Hex;
}

/**
 * Options for creating a smart account
 */
export interface CreateSmartAccountOptions {
  /** The P256 credential (WebAuthn) that will own the account */
  owner: P256Credential;
  /** Optional salt for deterministic address generation */
  salt?: bigint;
}

/**
 * Result of smart account creation
 */
export interface SmartAccountInstance {
  /** The smart account address */
  address: Address;
  /** Sign a user operation hash */
  signUserOperation(userOpHash: `0x${string}`): Promise<`0x${string}`>;
  /** Sign a message */
  signMessage(message: string | Uint8Array): Promise<`0x${string}`>;
  /** Encode a call to execute */
  encodeExecute(params: {
    to: Address;
    value: bigint;
    data: `0x${string}`;
  }): Promise<`0x${string}`>;
  /** Encode batch calls to execute */
  encodeBatchExecute(
    calls: Array<{
      to: Address;
      value: bigint;
      data: `0x${string}`;
    }>
  ): Promise<`0x${string}`>;
}

/**
 * Abstract interface for smart account implementations
 *
 * Implementations must support P256 (secp256r1) signatures for WebAuthn/Passkey compatibility.
 *
 * @example
 * ```typescript
 * // Using the default Coinbase adapter
 * const adapter = new CoinbaseAccountAdapter(publicClient);
 * const account = await adapter.createAccount({ owner: p256Credential });
 *
 * // Or inject a custom implementation
 * class MyCustomAdapter implements SmartAccountPort { ... }
 * ```
 */
export interface SmartAccountPort {
  /**
   * Create a smart account instance with the given P256 owner
   * @param options - Account creation options including the P256 credential
   * @returns Smart account instance ready for signing operations
   */
  createAccount(options: CreateSmartAccountOptions): Promise<SmartAccountInstance>;

  /**
   * Get the counterfactual address for an account before deployment
   * This is the deterministic address the account will have when deployed
   * @param options - Same options used for createAccount
   * @returns The counterfactual address
   */
  getAddress(options: CreateSmartAccountOptions): Promise<Address>;

  /**
   * Check if a smart account is deployed on-chain
   * @param address - The account address to check
   * @returns True if deployed, false otherwise
   */
  isDeployed(address: Address): Promise<boolean>;
}
