"use client";

// Listagem de rotas turísticas (SPE-05 T011/US2 — P1): DataTable com
// brinde + SALDO em destaque (prize-label esgotado=0 — clarificação Q2),
// status identificável (probe P1: "active"/"archived"), alternador
// "exibir arquivadas" (includeArchived admin-only — FR-012), ações na
// linha (editar/estoque/arquivar — arquivada sem ações, D5), estados
// distintos (Princípio V). Ajuste de estoque em DIÁLOGO acionado na LINHA
// (clarificação da 2ª sessão — sem página de detalhe/estoque). Arquivamento
// confirmado em diálogo transversal com efeito real (US5).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Button from "@/shared/components/Button";
import DataTable, { type DataTableColumnDef } from "@/shared/components/DataTable";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import ConfirmDeleteDialog from "@/shared/components/ConfirmDeleteDialog";
import { SessionEndedError } from "@/features/auth/api/errors";
import {
  useArchiveRouteMutation,
  useRoutesQuery,
} from "@/features/tours/api/queries";
import {
  SESSION_ENDED_PATH,
  failureFromError,
  describeRouteActionFailure,
} from "@/features/tours/api/messages";
import PrizeLabel from "@/features/tours/components/prize-label";
import RouteRowActions, { ARCHIVED_ROUTE_STATUS } from "@/features/tours/components/RouteRowActions";
import RouteStockDialog from "@/features/tours/components/RouteStockDialog";
import type { RouteSummaryView } from "@/features/tours/types";

const ARCHIVED_LABEL = "Arquivada";
const ACTIVE_LABEL = "Ativa";

type StockState = { route: RouteSummaryView } | null;
type ArchiveState = { route: RouteSummaryView } | null;

export default function ToursView() {
  const router = useRouter();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [stockState, setStockState] = useState<StockState>(null);
  const [archiveState, setArchiveState] = useState<ArchiveState>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const routesQuery = useRoutesQuery({ includeArchived });
  const archiveMutation = useArchiveRouteMutation();

  useEffect(() => {
    if (routesQuery.error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH);
    }
  }, [routesQuery.error, router]);

  function handleMutationError(error: unknown): boolean {
    if (error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // sessão encerrada — não é "erro da ação"
      return true;
    }
    return false;
  }

  const items = routesQuery.data?.items ?? [];

  const columns = useMemo<DataTableColumnDef<RouteSummaryView>[]>(() => {
    return [
      {
        id: "name",
        header: "Rota",
        accessorFn: (route: RouteSummaryView) => route.name,
        cell: (context) => <>{context.getValue()}</>,
      },
      {
        id: "description",
        header: "Descrição",
        accessorFn: (route: RouteSummaryView) => route.description,
        cell: (context) => <>{context.getValue()}</>,
      },
      {
        id: "spotCount",
        header: "Pontos",
        accessorFn: (route: RouteSummaryView) => route.spotCount,
        cell: (context) => <>{String(context.getValue() as number)}</>,
      },
      {
        id: "prize",
        header: "Brinde e saldo",
        accessorFn: (route: RouteSummaryView) => route.prize.stockQuantity,
        cell: (context) => {
          const prize = context.row.original.prize;
          return <PrizeLabel prizeName={prize.name} stockQuantity={prize.stockQuantity} />;
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (route: RouteSummaryView) => route.status,
        cell: (context) => {
          // Valores do probe P1 ("active"/"archived"); default conservador
          // para valor inesperado: exibe o literal cru (Princípio I — sem
          // inventar rótulo fora do contrato).
          const status = context.getValue() as string;
          return (
            <>{status === ARCHIVED_ROUTE_STATUS ? ARCHIVED_LABEL : status === "active" ? ACTIVE_LABEL : status}</>
          );
        },
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: (context) => {
          const route = context.row.original;
          return (
            <RouteRowActions
              route={route}
              onEdit={(target) => router.push(`/admin/tours/${String(target.id)}/edit`)}
              onStock={(target) => setStockState({ route: target })}
              onArchive={(target) => {
                setArchiveError(null);
                setArchiveState({ route: target });
              }}
            />
          );
        },
      },
    ];
  }, [router]);

  function confirmArchive() {
    if (!archiveState) return;
    setArchiveError(null);
    archiveMutation.mutate(archiveState.route.id, {
      onSuccess: () => {
        setArchiveState(null); // invalidação reflete o estado real (FR-012)
      },
      onError: (error) => {
        if (handleMutationError(error)) return;
        setArchiveError(describeRouteActionFailure(failureFromError(error)));
        // listagem revalidada (onError da mutação) — estado real
      },
    });
  }

  if (routesQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl">
        <LoadingState label="Carregando rotas…" />
      </div>
    );
  }
  if (routesQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-start gap-3">
          <ErrorState message={describeRouteActionFailure(failureFromError(routesQuery.error))} />
          <Button
            variant="secondary"
            onClick={() => {
              void routesQuery.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const archivedVisible = items.some((route) => route.status === ARCHIVED_ROUTE_STATUS);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-title-1">Rotas turísticas</h2>
          <span className="text-body text-foreground-muted">
            {String(items.length)} {items.length === 1 ? "rota" : "rotas"}
          </span>
        </div>
        <Button onClick={() => router.push("/admin/tours/new")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova rota
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4" role="group" aria-label="Opções da listagem">
        <label className="text-title-4 flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Exibir arquivadas
        </label>
        {includeArchived && archivedVisible ? (
          <span className="text-body text-foreground-muted">
            Rotas arquivadas são somente-leitura (sem ações).
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <EmptyState
            message={
              includeArchived
                ? "Nenhuma rota encontrada (ativas ou arquivadas)."
                : "Nenhuma rota cadastrada ainda."
            }
          />
          <Button variant="secondary" onClick={() => router.push("/admin/tours/new")}>
            Cadastrar primeira rota
          </Button>
        </div>
      ) : (
        <DataTable data={items} columns={columns} getRowKey={(route) => String(route.id)} />
      )}

      {stockState ? (
        <RouteStockDialog
          route={stockState.route}
          onClose={() => setStockState(null)}
        />
      ) : null}

      {archiveState ? (
        <ConfirmDeleteDialog
          title={`Arquivar rota ${archiveState.route.name}?`}
          description={
            <>
              A rota <strong>{archiveState.route.name}</strong> deixa de aparecer na
              listagem padrão (inclusive no app do turista), mas o{" "}
              <strong>histórico é preservado</strong> — o registro fica arquivado e
              visível com &quot;exibir arquivadas&quot;. Não é exclusão física, e a rota
              arquivada não pode ser editada nem reativada.
            </>
          }
          pending={archiveMutation.isPending}
          errorMessage={archiveError}
          onConfirm={confirmArchive}
          onClose={() => setArchiveState(null)}
          cancelLabel="Cancelar"
          confirmLabel="Arquivar rota"
          pendingLabel="Arquivando…"
        />
      ) : null}
    </div>
  );
}
