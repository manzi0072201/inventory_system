"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiClientError } from "@/lib/api";
import type { SettingsGroupKey } from "@/lib/api-types";
import {
  defaultSettings,
  settingsTabs,
  type AccentChoice,
  type SystemSettings,
} from "@/lib/settings-data";
import { settingsTabConfig } from "@/lib/settings-fields";

type SettingsContextValue = {
  settings: SystemSettings;
  updateSettings: (changes: Partial<SystemSettings>) => void;
  resetSettings: () => void;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const accentValues: Record<AccentChoice, string> = {
  Purple: "#7544e7",
  Blue: "#3985ed",
  Green: "#36b75b",
  Orange: "#d97706",
  Rose: "#e11d48",
};

const tabToGroup: Partial<Record<(typeof settingsTabs)[number], SettingsGroupKey>> = {
  General: "company",
  Localization: "localization",
  Inventory: "inventory",
  "Sales & POS": "salesPos",
  Purchasing: "purchasing",
  Finance: "finance",
  Notifications: "notifications",
  Security: "security",
  Appearance: "appearance",
  Documents: "documents",
  Integrations: "integrations",
  System: "system",
};

const settingToGroup = new Map<keyof SystemSettings, SettingsGroupKey>();
for (const tab of settingsTabs) {
  const group = tabToGroup[tab];
  if (!group) continue;
  for (const field of settingsTabConfig[tab].groups.flatMap((entry) => entry.fields)) {
    settingToGroup.set(field.key, group);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSettings(value: unknown): SystemSettings {
  if (!isRecord(value)) return defaultSettings;
  const next = { ...defaultSettings };
  for (const key of Object.keys(defaultSettings) as (keyof SystemSettings)[]) {
    const candidate = value[key];
    if (typeof candidate === typeof defaultSettings[key]) {
      next[key] = candidate as never;
    }
  }
  return next;
}

function flattenGroups(value: unknown): SystemSettings {
  const flat: Record<string, unknown> = {};
  if (!isRecord(value)) return normalizeSettings(flat);
  for (const group of Object.values(value)) {
    if (!isRecord(group)) continue;
    for (const [key, groupValue] of Object.entries(group)) {
      flat[key] = groupValue;
    }
  }
  return normalizeSettings(flat);
}

function toPayload(settings: Partial<SystemSettings>): Record<string, unknown> {
  const payload: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(settings) as [
    keyof SystemSettings,
    SystemSettings[keyof SystemSettings],
  ][]) {
    const group = settingToGroup.get(key);
    if (!group) continue;
    payload[group] ??= {};
    payload[group][key] = value;
  }
  return payload;
}

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function applyAppearance(settings: SystemSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolvedTheme =
    settings.theme === "System"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : settings.theme.toLowerCase();
  root.style.setProperty("--purple", accentValues[settings.accentColor]);
  root.dataset.theme = resolvedTheme;
  root.dataset.density = settings.density.toLowerCase();
  root.dataset.fontSize = settings.fontSize.toLowerCase();
  root.dataset.accent = settings.accentColor.toLowerCase();
  document.body.classList.toggle("hide-footer", !settings.showFooter);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.settings();
      setSettings(flattenGroups(response));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load settings."));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);

  const updateSettings = useCallback(
    (changes: Partial<SystemSettings>) => {
      setSettings((current) => ({ ...current, ...changes }));
      void (async () => {
        try {
          await api.updateSettings(toPayload(changes));
          setError(null);
        } catch (cause) {
          setError(errorMessage(cause, "Unable to save settings."));
        }
      })();
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    void (async () => {
      try {
        await api.updateSettings(toPayload(defaultSettings));
        setError(null);
      } catch (cause) {
        setError(errorMessage(cause, "Unable to reset settings."));
      }
    })();
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSettings, resetSettings, hydrated, error, reload: load }),
    [settings, updateSettings, resetSettings, hydrated, error, load],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
