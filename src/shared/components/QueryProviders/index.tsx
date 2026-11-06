"use client";

// Provider transversal do TanStack Query (SPE-02 rodada 2, T003 —
// REVISÃO 2/D10, Princípio IV): montado uma única vez no
// `src/app/(panel)/layout.tsx`, reusável por SPE-03..07. QueryClient em
// `useState` (estado local do provider — nunca em escopo de módulo, que
// quebraria SSR/streaming e compartilharia cache entre requests).
// Política de erro: `retry: false` — falha vira estado de erro imediato e
// visível (Princípio V), sem retentativas silenciosas contra o backend.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export default function QueryProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // D10/Princípio V: estado de erro imediato; nova tentativa
            // é sempre uma AÇÃO do operador (botão), não automática.
            retry: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
