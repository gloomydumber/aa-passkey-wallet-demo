"use client";

/**
 * Login Page
 *
 * Entry point for the wallet. Shows registration for new users
 * and login for returning users with credential selection.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasskeyRegister } from "@/components/auth/passkey-register";
import { PasskeyLogin } from "@/components/auth/passkey-login";
import { CredentialSelector } from "@/components/auth/credential-selector";
import { useWallet } from "@/providers/wallet-provider";
import { useWalletStore, selectIsAuthenticated } from "@/stores/wallet-store";
import { getPasskeyService } from "@/lib/wallet-client";
import { Wallet, Loader2 } from "lucide-react";
import type { PasskeyCredential } from "@aa-wallet/types";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { isReady } = useWallet();
  const isAuthenticated = useWalletStore(selectIsAuthenticated);

  const [mode, setMode] = useState<AuthMode>("register");
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<PasskeyCredential | null>(null);
  const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Check for existing credentials on mount
  useEffect(() => {
    if (!isReady) return;

    async function checkCredentials() {
      try {
        const passkeyService = getPasskeyService();
        // Get credentials sorted by last used (most recent first)
        const sortedCredentials = await passkeyService.getCredentialsSortedByLastUsed();

        if (sortedCredentials.length > 0) {
          // User has existing credentials, show login
          setCredentials(sortedCredentials);
          setSelectedCredential(sortedCredentials[0]); // Select most recent by default
          setMode("login");
        } else {
          // New user, show registration
          setMode("register");
        }
      } catch (error) {
        console.error("Failed to check credentials:", error);
      } finally {
        setIsCheckingCredentials(false);
      }
    }

    checkCredentials();
  }, [isReady]);

  // Redirect if already authenticated (only on initial load, not after login/register)
  useEffect(() => {
    if (isAuthenticated && !isCheckingCredentials && !isRedirecting) {
      // User is already logged in, redirect to dashboard
      router.push("/dashboard");
    }
  }, [isAuthenticated, isCheckingCredentials, isRedirecting, router]);

  const handleRegisterSuccess = () => {
    // New account - go to activate page for easy deploying
    setIsRedirecting(true);
    router.push("/activate");
  };

  const handleLoginSuccess = () => {
    // Existing account - go to dashboard (layout will redirect to /activate if not deployed)
    setIsRedirecting(true);
    router.push("/dashboard");
  };

  const handleCredentialSelect = (credential: PasskeyCredential) => {
    setSelectedCredential(credential);
  };

  // Show loading state
  if (!isReady || isCheckingCredentials) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Wallet className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          </div>
          <CardTitle>
            {mode === "register" ? "Create Your Wallet" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {mode === "register"
              ? "Secure your wallet with a passkey. No passwords needed."
              : "Sign in with your passkey to access your wallet."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "register" ? (
            <PasskeyRegister onSuccess={handleRegisterSuccess} />
          ) : (
            <div className="space-y-4">
              {/* Credential selector for multiple accounts */}
              <CredentialSelector
                credentials={credentials}
                selectedId={selectedCredential?.id ?? null}
                onSelect={handleCredentialSelect}
              />

              {/* Login button */}
              {selectedCredential && (
                <PasskeyLogin
                  credential={selectedCredential}
                  onSuccess={handleLoginSuccess}
                />
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            {mode === "register" ? (
              credentials.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setMode("login")}
                  className="text-sm"
                >
                  Already have a wallet? Sign in
                </Button>
              )
            ) : (
              <Button
                variant="ghost"
                onClick={() => setMode("register")}
                className="text-sm"
              >
                Create a new wallet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
