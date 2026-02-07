"use client";

/**
 * Theme Settings Component
 *
 * Three-option toggle for theme selection: System / Light / Dark
 */

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, Sun, Moon } from "lucide-react";
import { clsx } from "clsx";

type ThemeOption = "system" | "light" | "dark";

interface ThemeButtonProps {
  value: ThemeOption;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

function ThemeButton({ label, icon, isActive, onClick }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
        isActive
          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-800"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
      )}
    >
      <div
        className={clsx(
          "flex h-10 w-10 items-center justify-center rounded-full",
          isActive
            ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        )}
      >
        {icon}
      </div>
      <span
        className={clsx(
          "text-sm font-medium",
          isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardContent>
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-4 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const options: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: "System", icon: <Monitor className="h-5 w-5" /> },
    { value: "light", label: "Light", icon: <Sun className="h-5 w-5" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-5 w-5" /> },
  ];

  return (
    <Card>
      <CardContent>
        <div className="flex gap-3">
          {options.map((option) => (
            <ThemeButton
              key={option.value}
              value={option.value}
              label={option.label}
              icon={option.icon}
              isActive={theme === option.value}
              onClick={() => setTheme(option.value)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
