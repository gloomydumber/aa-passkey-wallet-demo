"use client";

/**
 * Account Settings Component
 *
 * Displays stored credentials and provides sign out / clear all data options.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPasskeyService } from "@/lib/wallet-client";
import { useWalletStore } from "@/stores/wallet-store";
import { Trash2, LogOut, AlertTriangle, Info } from "lucide-react";
import type { PasskeyCredential } from "@aa-wallet/types";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  isDestructive,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        </div>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "primary"}
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AccountSettings() {
  const router = useRouter();
  const { logout: walletLogout } = useWalletStore();
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteCredentialId, setDeleteCredentialId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  async function loadCredentials() {
    try {
      const creds = await getPasskeyService().getCredentialsSortedByLastUsed();
      setCredentials(creds);
    } catch (error) {
      console.error("Failed to load credentials:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await getPasskeyService().logout();
      walletLogout();
      router.push("/");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  }

  async function handleDeleteCredential(credentialId: string) {
    try {
      await getPasskeyService().removeCredential(credentialId);
      setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
      setDeleteCredentialId(null);
    } catch (error) {
      console.error("Failed to delete credential:", error);
    }
  }

  async function handleClearAllData() {
    try {
      await getPasskeyService().clearAllCredentials();
      // Clear other persisted stores
      localStorage.removeItem("aa-wallet:settings");
      localStorage.removeItem("aa-wallet:network");
      localStorage.removeItem("aa-wallet:activity");
      walletLogout();
      router.push("/");
    } catch (error) {
      console.error("Failed to clear all data:", error);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          {/* Credentials List */}
          {credentials.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No credentials stored
            </p>
          ) : (
            <div className="space-y-2">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {credential.name || "Unnamed Wallet"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Created: {formatDate(credential.createdAt)}
                      {credential.lastUsedAt && (
                        <> · Last used: {formatDate(credential.lastUsedAt)}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteCredentialId(credential.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                    title="Delete credential"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleSignOut} className="flex-1">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowClearAllModal(true)}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Data
            </Button>
          </div>

          {/* Backup Notice */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs text-amber-700 dark:text-amber-300">
              <p className="font-medium">Backup & Restore Coming Soon</p>
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                Credentials are stored only in this browser. Clearing data or switching devices will
                remove access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Credential Modal */}
      {deleteCredentialId && (
        <ConfirmModal
          title="Delete Credential"
          message="This will remove the credential from your browser. You may need to re-register a passkey to use this wallet again."
          confirmLabel="Delete"
          isDestructive
          onConfirm={() => handleDeleteCredential(deleteCredentialId)}
          onCancel={() => setDeleteCredentialId(null)}
        />
      )}

      {/* Clear All Data Modal */}
      {showClearAllModal && (
        <ConfirmModal
          title="Clear All Data"
          message="This will permanently delete all credentials, settings, and activity history from this browser. This action cannot be undone."
          confirmLabel="Clear All"
          isDestructive
          onConfirm={handleClearAllData}
          onCancel={() => setShowClearAllModal(false)}
        />
      )}
    </>
  );
}
