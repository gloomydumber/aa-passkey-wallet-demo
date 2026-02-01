"use client";

/**
 * Settings Page (Placeholder)
 *
 * TODO: Implement settings including network config and credential management.
 */

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg p-4">
      <header className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
      </header>

      <Card>
        <CardHeader className="text-center">
          <Construction className="mx-auto h-12 w-12 text-zinc-400" />
          <CardTitle className="text-lg">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Settings page will include network configuration,
          credential management, and other preferences.
        </CardContent>
      </Card>
    </div>
  );
}
