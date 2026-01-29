/**
 * Common types for AA Passkey Wallet
 */

export type Address = `0x${string}`;

export type Hex = `0x${string}`;

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface StoragePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
