"use client";

// Casca INTERNA dos cards do dashboard (SPE-07 T007 — FR-015/FR-020):
// título + estados visíveis e DISTINCTOS (carregando/vazio/erro — RNF13,
// Princípio V) reusando LoadingState/EmptyState/ErrorState de
// `src/shared/components` (Princípio IV — nada novo criado) e botão de
// recarregar manual (FR-020 — sem polling). Cada card é uma query
// independente: a falha de UM card não impede os demais (o estado é
// calculado pelo próprio card e chega por props).

import type { ReactNode } from "react";
import Button from "@/shared/components/Button";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { RETRY_LABEL, describeReadError } from "@/features/dashboard/api/messages";

export interface DashboardCardProps {
  title: string;
  description?: string;
  /** query.isPending (1ª carga) — skeleton, sem "salto" de layout. */
  loading: boolean;
  /** Erro da leitura (classe classificada pelo túnel BFF). */
  error: unknown;
  /** Não-nulo ⇒ estado de vazio legítimo (mensagem acionável). */
  emptyMessage: string | null;
  /** Refetch manual da query do card (FR-020 — hook retorna `refetch`). */
  refetch: () => void;
  /** Conteúdo pronto (`status === "ready"` do card). */
  children?: ReactNode;
}

export default function DashboardCard({
  title,
  description,
  loading,
  error,
  emptyMessage,
  refetch,
  children,
}: DashboardCardProps) {
  const hasError = Boolean(error);
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <header className="flex flex-col gap-0.5">
        <h2 className="text-title-3">{title}</h2>
        {description ? (
          <p className="text-caption text-foreground-muted">{description}</p>
        ) : null}
      </header>
      <div className="min-h-[120px]">
        {loading ? (
          <LoadingState label={`Carregando ${title.toLowerCase()}…`} />
        ) : hasError ? (
          <div className="flex flex-col items-start gap-2">
            <ErrorState message={describeReadError(error)} />
            <Button variant="secondary" onClick={() => refetch()}>
              {RETRY_LABEL}
            </Button>
          </div>
        ) : emptyMessage !== null ? (
          <EmptyState message={emptyMessage} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}
