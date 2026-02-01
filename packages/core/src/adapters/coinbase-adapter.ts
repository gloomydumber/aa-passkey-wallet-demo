/**
 * Coinbase Smart Account Adapter
 *
 * Default implementation of SmartAccountPort using Coinbase Smart Account.
 * Supports P256 (secp256r1) signatures for WebAuthn/Passkey authentication.
 */

import { type PublicClient } from "viem";
import { toCoinbaseSmartAccount, toWebAuthnAccount } from "viem/account-abstraction";
import type {
  SmartAccountPort,
  SmartAccountInstance,
  CreateSmartAccountOptions,
  Address,
} from "@aa-wallet/types";

export interface CoinbaseAdapterConfig {
  client: PublicClient;
  /** Coinbase Smart Account version. Defaults to '1.1' */
  version?: "1" | "1.1";
}

/**
 * Adapter for Coinbase Smart Account
 *
 * @example
 * ```typescript
 * const adapter = new CoinbaseAccountAdapter({ client: publicClient });
 *
 * // Create account with P256 credential from WebAuthn
 * const account = await adapter.createAccount({
 *   owner: { id: credentialId, publicKey: '0x...' }
 * });
 *
 * console.log("Account address:", account.address);
 * ```
 */
export class CoinbaseAccountAdapter implements SmartAccountPort {
  private client: PublicClient;
  private version: "1" | "1.1";

  constructor(config: CoinbaseAdapterConfig) {
    this.client = config.client;
    this.version = config.version ?? "1.1";
  }

  /**
   * Create a Coinbase Smart Account with the given P256 owner
   */
  async createAccount(options: CreateSmartAccountOptions): Promise<SmartAccountInstance> {
    const { owner } = options;

    // Convert P256 credential to viem's WebAuthn account format
    const webAuthnAccount = toWebAuthnAccount({
      credential: {
        id: owner.id,
        publicKey: owner.publicKey,
      },
    });

    // Create Coinbase Smart Account with WebAuthn owner
    const smartAccount = await toCoinbaseSmartAccount({
      client: this.client,
      owners: [webAuthnAccount],
      version: this.version,
    });

    // Wrap in our SmartAccountInstance interface
    return this.wrapSmartAccount(smartAccount);
  }

  /**
   * Get the counterfactual address for an account before deployment
   */
  async getAddress(options: CreateSmartAccountOptions): Promise<Address> {
    const account = await this.createAccount(options);
    return account.address;
  }

  /**
   * Check if a smart account is deployed on-chain
   */
  async isDeployed(address: Address): Promise<boolean> {
    const code = await this.client.getCode({ address });
    return code !== undefined && code !== "0x";
  }

  /**
   * Wrap viem's smart account in our SmartAccountInstance interface
   */
  private wrapSmartAccount(
    smartAccount: Awaited<ReturnType<typeof toCoinbaseSmartAccount>>
  ): SmartAccountInstance {
    return {
      address: smartAccount.address,

      async signUserOperation(userOpHash: `0x${string}`): Promise<`0x${string}`> {
        // The smart account's sign method handles UserOp signing
        return smartAccount.sign({ hash: userOpHash });
      },

      async signMessage(message: string | Uint8Array): Promise<`0x${string}`> {
        const messageToSign = typeof message === "string" ? message : { raw: message };
        return smartAccount.signMessage({ message: messageToSign });
      },

      async encodeExecute(params: {
        to: Address;
        value: bigint;
        data: `0x${string}`;
      }): Promise<`0x${string}`> {
        return smartAccount.encodeCalls([
          {
            to: params.to,
            value: params.value,
            data: params.data,
          },
        ]);
      },

      async encodeBatchExecute(
        calls: Array<{ to: Address; value: bigint; data: `0x${string}` }>
      ): Promise<`0x${string}`> {
        return smartAccount.encodeCalls(calls);
      },
    };
  }
}
