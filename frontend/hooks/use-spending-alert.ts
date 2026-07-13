"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/services/api/easysaving";
import { today } from "@/lib/utils";

export type SpendingAlertPeriod = "daily" | "weekly" | "monthly";

export type SpendingAlertSettings = {
  enabled: boolean;
  period: SpendingAlertPeriod;
  limit: string;
};

const KEY = "easysaving_spending_alert";
const EVENT = "easysaving:spending-alert-change";

export const defaultSpendingAlertSettings: SpendingAlertSettings = {
  enabled: false,
  period: "monthly",
  limit: ""
};

function normalizeSettings(value: unknown): SpendingAlertSettings {
  if (!value || typeof value !== "object") return defaultSpendingAlertSettings;
  const record = value as Partial<SpendingAlertSettings>;
  const period: SpendingAlertPeriod = record.period === "daily" || record.period === "weekly" || record.period === "monthly" ? record.period : "monthly";
  return {
    enabled: Boolean(record.enabled),
    period,
    limit: record.limit ?? ""
  };
}

function readSettings() {
  if (typeof window === "undefined") return defaultSpendingAlertSettings;
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultSpendingAlertSettings;
  try {
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return defaultSpendingAlertSettings;
  }
}

function writeSettings(settings: SpendingAlertSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: settings }));
}

export function useSpendingAlertSettings() {
  const [settings, setSettingsState] = useState(defaultSpendingAlertSettings);

  useEffect(() => {
    setSettingsState(readSettings());

    function syncFromStorage(event: StorageEvent) {
      if (event.key === KEY) setSettingsState(readSettings());
    }
    function syncFromLocal(event: Event) {
      setSettingsState(normalizeSettings((event as CustomEvent<SpendingAlertSettings>).detail));
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(EVENT, syncFromLocal);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(EVENT, syncFromLocal);
    };
  }, []);

  const setSettings = useCallback((next: SpendingAlertSettings) => {
    const normalized = normalizeSettings(next);
    setSettingsState(normalized);
    writeSettings(normalized);
  }, []);

  return { settings, setSettings };
}

export function useSpendingAlertStatus() {
  const { settings } = useSpendingAlertSettings();
  const limit = Number(settings.limit) || 0;
  const date = today();
  const enabled = settings.enabled && limit > 0;

  const { data, isFetching } = useQuery({
    queryKey: ["summary", settings.period, date],
    queryFn: () => endpoints.summary(settings.period, date),
    enabled,
    staleTime: 0
  });

  return useMemo(() => {
    const spent = Number(data?.total_expense ?? 0) || 0;
    const exceeded = enabled && spent > limit;
    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 999) : 0;

    return {
      enabled,
      period: settings.period,
      limit,
      spent,
      exceeded,
      percentage,
      loading: enabled && isFetching && !data
    };
  }, [data, enabled, isFetching, limit, settings.period]);
}
