"use client";

/**
 * About Settings Component
 *
 * Displays app version and links to resources.
 */

import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const APP_VERSION = "0.1.0";
const GITHUB_URL = "https://github.com/gloomydumber/aa-passkey-wallet-demo";

interface LinkRowProps {
  label: string;
  href: string;
}

function LinkRow({ label, href }: LinkRowProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

export function AboutSettings() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Version</span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {APP_VERSION}
          </span>
        </div>

        <div className="flex gap-4">
          <LinkRow label="GitHub" href={GITHUB_URL} />
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          AA Passkey Wallet is an open-source project demonstrating Account Abstraction with Passkey authentication.
        </p>
      </CardContent>
    </Card>
  );
}
