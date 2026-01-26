/**
 * Account types for AA Passkey Wallet
 */

export type AccountMode = "aa" | "eoa";

export interface SmartAccount {
  /** The smart account address (counterfactual or deployed) */
  address: `0x${string}`;
  /** Whether the account is deployed on-chain */
  isDeployed: boolean;
  /** The account mode */
  mode: AccountMode;
  /** Chain ID where the account exists */
  chainId: number;
  /** Associated passkey credential ID */
  credentialId: string;
  /** Creation timestamp */
  createdAt: number;
}

export interface AccountState {
  /** Current active account */
  activeAccount: SmartAccount | null;
  /** List of all accounts */
  accounts: SmartAccount[];
  /** Whether the wallet is initialized */
  isInitialized: boolean;
}
