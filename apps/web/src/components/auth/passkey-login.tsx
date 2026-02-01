"use client";

/**
 * Passkey Login Component
 *
 * Handles WebAuthn authentication for returning users.
 * Requires biometric/PIN verification before granting access.
 */

import { useState } from "react";
import { toWebAuthnAccount } from "viem/account-abstraction";
import { Button } from "@/components/ui/button";
import { getPasskeyService, createSmartAccountAdapter } from "@/lib/wallet-client";
import { useWalletStore } from "@/stores/wallet-store";
import { useNetworkStore } from "@/stores/network-store";
import { KeyRound } from "lucide-react";
import type { PasskeyCredential } from "@aa-wallet/types";

interface PasskeyLoginProps {
  credential: PasskeyCredential;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Trigger WebAuthn authentication by signing a challenge
 * This forces biometric/PIN verification
 */
async function authenticateWithWebAuthn(credentialId: string): Promise<void> {
  // Generate a random challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  // Request WebAuthn authentication - this triggers biometric/PIN
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          type: "public-key",
          id: Uint8Array.from(atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
        },
      ],
      userVerification: "required",
      timeout: 60000,
    },
  });

  if (!assertion) {
    throw new Error("Authentication cancelled");
  }
}

export function PasskeyLogin({ credential, onSuccess, onError }: PasskeyLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAccount, setSession, setLoading } = useWalletStore();
  const { activeNetwork } = useNetworkStore();

  const handleLogin = async () => {
    setIsLoading(true);
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with WebAuthn (triggers biometric/PIN prompt)
      await authenticateWithWebAuthn(credential.id);

      // 2. Create WebAuthn account from stored credential
      // Note: webAuthnAccount will be used for transaction signing in Send screen
      const _webAuthnAccount = toWebAuthnAccount({
        credential: {
          id: credential.id,
          publicKey: credential.publicKey as `0x${string}`,
        },
      });

      // 3. Create smart account with the credential
      const adapter = createSmartAccountAdapter(activeNetwork);
      const smartAccount = await adapter.createAccount({
        owner: {
          id: credential.id,
          publicKey: credential.publicKey as `0x${string}`,
        },
      });

      // 4. Start session
      const passkeyService = getPasskeyService();
      const session = await passkeyService.startSession(credential.id);

      // 5. Update store
      setAccount(smartAccount, smartAccount.address);
      setSession(session);

      onSuccess?.();
    } catch (err) {
      console.error("Login failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      <Button
        onClick={handleLogin}
        isLoading={isLoading}
        className="w-full"
        size="lg"
      >
        <KeyRound className="h-5 w-5" />
        Sign in with Passkey
      </Button>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Use your biometric or device PIN to sign in.
      </p>
    </div>
  );
}
