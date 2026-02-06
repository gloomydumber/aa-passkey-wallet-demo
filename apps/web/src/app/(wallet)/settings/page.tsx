"use client";

/**
 * Settings Page
 *
 * Comprehensive settings screen with session, account, provider, theme, and about sections.
 */

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  SessionSettings,
  AccountSettings,
  ProviderSettings,
  ThemeSettings,
  AboutSettings,
} from "@/components/settings";
import { ArrowLeft, Clock, User, Globe, Palette, Info } from "lucide-react";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg p-4">
      <header className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
      </header>

      <div className="space-y-6">
        <Section icon={<Clock className="h-4 w-4" />} title="Session">
          <SessionSettings />
        </Section>

        <Section icon={<User className="h-4 w-4" />} title="Accounts">
          <AccountSettings />
        </Section>

        <Section icon={<Globe className="h-4 w-4" />} title="Providers">
          <ProviderSettings />
        </Section>

        <Section icon={<Palette className="h-4 w-4" />} title="Appearance">
          <ThemeSettings />
        </Section>

        <Section icon={<Info className="h-4 w-4" />} title="About">
          <AboutSettings />
        </Section>
      </div>
    </div>
  );
}
