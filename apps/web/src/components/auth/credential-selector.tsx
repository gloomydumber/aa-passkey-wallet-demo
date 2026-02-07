"use client";

/**
 * Credential Selector Component
 *
 * Displays passkey credentials in a simple scrollable list.
 * - 1 credential: Single card
 * - 2+ credentials: Scrollable list (max-height with overflow)
 */

import { Check } from "lucide-react";
import type { PasskeyCredential } from "@aa-wallet/types";

interface CredentialSelectorProps {
  credentials: PasskeyCredential[];
  selectedId: string | null;
  onSelect: (credential: PasskeyCredential) => void;
}

interface CredentialCardProps {
  credential: PasskeyCredential;
  isSelected: boolean;
  onSelect: () => void;
}

function CredentialCard({ credential, isSelected, onSelect }: CredentialCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        isSelected
          ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
          : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {credential.name || "My Wallet"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {credential.lastUsedAt
              ? `Last used ${formatRelativeTime(credential.lastUsedAt)}`
              : `Created ${new Date(credential.createdAt).toLocaleDateString()}`}
          </p>
        </div>
        {isSelected && (
          <div className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100">
            <Check className="h-3 w-3 text-white dark:text-zinc-900" />
          </div>
        )}
      </div>
    </button>
  );
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function CredentialSelector({ credentials, selectedId, onSelect }: CredentialSelectorProps) {
  if (credentials.length === 0) {
    return null;
  }

  // Single credential - just show it
  if (credentials.length === 1) {
    return (
      <CredentialCard
        credential={credentials[0]}
        isSelected={selectedId === credentials[0].id}
        onSelect={() => onSelect(credentials[0])}
      />
    );
  }

  // 2+ credentials - recent at top, then other accounts in scrollable list
  const [mostRecent, ...others] = credentials;

  return (
    <div className="space-y-3">
      {/* Most recently used - shown separately */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Recent</p>
        <CredentialCard
          credential={mostRecent}
          isSelected={selectedId === mostRecent.id}
          onSelect={() => onSelect(mostRecent)}
        />
      </div>

      {/* Other accounts list (excluding recent) */}
      {others.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Other accounts
          </p>
          <div className="max-h-[150px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
            {others.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                isSelected={selectedId === credential.id}
                onSelect={() => onSelect(credential)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
