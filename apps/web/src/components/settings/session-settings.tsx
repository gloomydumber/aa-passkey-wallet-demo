"use client";

/**
 * Session Settings Component
 *
 * Allows users to configure session timeout preferences.
 * Note: Changes take effect on next login (not dynamically).
 */

import { Card, CardContent } from "@/components/ui/card";
import {
  useSettingsStore,
  INACTIVITY_TIMEOUT_OPTIONS,
  MAX_SESSION_DURATION_OPTIONS,
} from "@/stores/settings-store";
import { Info } from "lucide-react";

export function SessionSettings() {
  const { inactivityTimeout, maxSessionDuration, setInactivityTimeout, setMaxSessionDuration } =
    useSettingsStore();

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor="inactivity-timeout"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Inactivity Timeout
          </label>
          <select
            id="inactivity-timeout"
            value={inactivityTimeout}
            onChange={(e) => setInactivityTimeout(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            {INACTIVITY_TIMEOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="max-session"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Max Session Duration
          </label>
          <select
            id="max-session"
            value={maxSessionDuration}
            onChange={(e) => setMaxSessionDuration(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            {MAX_SESSION_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Changes take effect on next login
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
