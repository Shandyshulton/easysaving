"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 20,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1
          },
          mutations: {
            retry: 0
          }
        }
      })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
