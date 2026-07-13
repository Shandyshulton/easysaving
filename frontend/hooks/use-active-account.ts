"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "easysaving_active_account_id";
const EVENT = "easysaving:active-account-change";

export function useActiveAccountId() {
  const [accountId, setAccountIdState] = useState("");

  useEffect(() => {
    setAccountIdState(localStorage.getItem(KEY) ?? "");

    // Keep the active account in sync across tabs/windows (storage event)
    // and across components within the same tab (custom event), so every
    // screen reading this hook reflects the same "active account" instantly.
    function syncFromStorage(event: StorageEvent) {
      if (event.key === KEY) setAccountIdState(event.newValue ?? "");
    }
    function syncFromLocal(event: Event) {
      setAccountIdState((event as CustomEvent<string>).detail ?? "");
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(EVENT, syncFromLocal);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(EVENT, syncFromLocal);
    };
  }, []);

  const setAccountId = useCallback((value: string) => {
    setAccountIdState(value);
    if (value) {
      localStorage.setItem(KEY, value);
    } else {
      localStorage.removeItem(KEY);
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
  }, []);

  return { accountId, setAccountId };
}
