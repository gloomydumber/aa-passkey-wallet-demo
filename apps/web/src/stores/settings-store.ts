/**
 * Settings Store
 *
 * Manages user preferences: session timeouts, theme, etc.
 * Persisted to localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Default values
const DEFAULT_INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export type Theme = "system" | "light" | "dark";

interface SettingsState {
  // Session settings (in milliseconds)
  inactivityTimeout: number;
  maxSessionDuration: number;

  // Appearance
  theme: Theme;

  // Actions
  setInactivityTimeout: (ms: number) => void;
  setMaxSessionDuration: (ms: number) => void;
  setTheme: (theme: Theme) => void;
  resetToDefaults: () => void;
}

const initialState = {
  inactivityTimeout: DEFAULT_INACTIVITY_TIMEOUT,
  maxSessionDuration: DEFAULT_MAX_SESSION_DURATION,
  theme: "system" as Theme,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setInactivityTimeout: (ms) => set({ inactivityTimeout: ms }),

      setMaxSessionDuration: (ms) => set({ maxSessionDuration: ms }),

      setTheme: (theme) => set({ theme }),

      resetToDefaults: () => set(initialState),
    }),
    {
      name: "aa-wallet:settings",
    }
  )
);

// Timeout options for dropdowns (value in ms, label for display)
export const INACTIVITY_TIMEOUT_OPTIONS = [
  { value: 5 * 60 * 1000, label: "5 minutes" },
  { value: 10 * 60 * 1000, label: "10 minutes" },
  { value: 15 * 60 * 1000, label: "15 minutes" },
  { value: 30 * 60 * 1000, label: "30 minutes" },
];

export const MAX_SESSION_DURATION_OPTIONS = [
  { value: 30 * 60 * 1000, label: "30 minutes" },
  { value: 60 * 60 * 1000, label: "1 hour" },
  { value: 120 * 60 * 1000, label: "2 hours" },
];
