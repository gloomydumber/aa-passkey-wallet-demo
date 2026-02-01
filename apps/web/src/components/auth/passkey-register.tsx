"use client";

/**
 * Passkey Register Component
 *
 * Handles WebAuthn credential registration using viem's createWebAuthnCredential.
 */

import { useState } from "react";
import { createWebAuthnCredential } from "viem/account-abstraction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPasskeyService, createSmartAccountAdapter } from "@/lib/wallet-client";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { Fingerprint } from "lucide-react";

interface PasskeyRegisterProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function PasskeyRegister({ onSuccess, onError }: PasskeyRegisterProps) {
  const [walletName, setWalletName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAccount, setCredential, setSession, setLoading } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

  const handleRegister = async () => {
    if (!walletName.trim()) {
      setError("Please enter a wallet name");
      return;
    }

    setIsLoading(true);
    setLoading(true);
    setError(null);

    try {
      // 1. Create WebAuthn credential using viem
      const viemCredential = await createWebAuthnCredential({
        name: walletName,
      });

      // 2. Save credential to passkey service
      const passkeyService = getPasskeyService();
      const credentialToSave = {
        id: viemCredential.id,
        rawId: viemCredential.id, // viem returns base64url encoded id
        publicKey: viemCredential.publicKey,
        algorithm: -7, // ES256 (P-256)
        createdAt: Date.now(),
        name: walletName,
      };

      await passkeyService.saveCredential(credentialToSave);

      // 3. Create smart account with the credential
      const adapter = createSmartAccountAdapter(activeNetwork);
      const smartAccount = await adapter.createAccount({
        owner: {
          id: viemCredential.id,
          publicKey: viemCredential.publicKey,
        },
      });

      // 4. Start session
      const session = await passkeyService.startSession(viemCredential.id);

      // 5. Update store
      setAccount(smartAccount, smartAccount.address);
      setCredential(credentialToSave);
      setSession(session);

      onSuccess?.();
    } catch (err) {
      console.error("Registration failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="wallet-name" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Wallet Name
        </label>
        <Input
          id="wallet-name"
          placeholder="My Wallet"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
          disabled={isLoading}
          error={error ?? undefined}
        />
      </div>

      <Button
        onClick={handleRegister}
        isLoading={isLoading}
        disabled={!walletName.trim()}
        className="w-full"
        size="lg"
      >
        <Fingerprint className="h-5 w-5" />
        Create Wallet with Passkey
      </Button>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Your passkey will be stored securely on this device.
        No password needed.
      </p>
    </div>
  );
}
