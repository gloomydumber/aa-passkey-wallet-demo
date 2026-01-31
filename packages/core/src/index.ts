// @aa-wallet/core
// Wallet engine for AA, chain interactions, and transactions

// Client factories
export * from "./clients";

// Network configuration and management
export * from "./networks";

// Smart account adapters
export * from "./adapters";

// Re-export types for convenience
export type {
  SmartAccountPort,
  SmartAccountInstance,
  CreateSmartAccountOptions,
  P256Credential,
} from "@aa-wallet/types";
