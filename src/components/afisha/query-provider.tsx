"use client";

/**
 * Провайдер TanStack Query — менеджер серверного состояния приложения.
 * Кэширует ответы REST API, хранит статусы загрузки и ошибки,
 * автоматически переиспользует данные одинаковых запросов.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
