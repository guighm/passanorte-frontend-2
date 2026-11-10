"use client";

// Listagem de eventos (SPE-04 T009/US1 — P1 MVP): DataTable completo,
// filtro por ponto turístico SERVER-side (`spotId` na query — FR-003,
// nenhum recorte local), nome do ponto resolvido pelo catálogo completo
// (FR-012/fallback), estados distintos (Princípio V), remoção confirmada
// em diálogo transversal (US4/T020). Ordem: a da API `(occurrenceDate,
// id)` — sem reordenação client sobre a lista única (contrato sem
// paginação).

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
  useDeleteEventMutation,
  useEventsQuery,
  useSpotCatalogQuery,
} from "@/features/events/api/queries";
import {
  SESSION_ENDED_PATH,
  failureFromError,
  describeEventActionFailure,
} from "@/features/events/api/messages";
import { resolveSpotName, SPOT_LOADING_LABEL } from "@/features/events/components/spot-name";
import EventRowActions from "@/features/events/components/EventRowActions";
import type { EventView } from "@/features/events/types";

type DeleteState = { event: EventView } | null;

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const currencyFormat = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatOccurrenceDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return dateFormat.format(new Date(Number(year), Number(month) - 1, Number(day)));
}

/** Preço em moeda pt-BR; 0 ⇒ "R$ 0,00" (gratuito) — SC-002/US2.5. */
function formatTicketPrice(value: number): string {
  return currencyFormat.format(value);
}

export default function EventsView() {
  const router = useRouter();
  const [spotFilter, setSpotFilter] = useState<"all" | number>("all");
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const eventsQuery = useEventsQuery({ spotId: spotFilter === "all" ? null : spotFilter });
  const catalog = useSpotCatalogQuery(); // alimenta o filtro e os nomes (FR-006/FR-012)
  const deleteMutation = useDeleteEventMutation();

  useEffect(() => {
    if (eventsQuery.error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH);
    }
  }, [eventsQuery.error, router]);

  function handleMutationError(error: unknown): boolean {
    if (error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // FR-007 — não é "erro da ação"
      return true;
    }
    return false;
  }

  const items = eventsQuery.data?.items ?? [];

  const columns = useMemo<DataTableColumnDef<EventView>[]>(() => {
    return [
      {
        id: "spot",
        header: "Ponto turístico",
        accessorFn: (event: EventView) => resolveSpotName(catalog, event.spotId).name,
        cell: (context) => {
          // Estados TRÊS (T024): loading ≠ unresolved — o fallback
          // "ponto turístico não encontrado" (FR-012) é reservado para
          // catálogo completo sem o spotId (ponto removido), nunca para
          // carga em curso.
          const resolution = resolveSpotName(catalog, context.row.original.spotId);
          if (resolution.state === "loading") {
            return (
              <span className="text-body text-foreground-muted" aria-busy="true">
                {resolution.name}
              </span>
            );
          }
          return <>{resolution.name}</>;
        },
      },
      {
        id: "occurrenceDate",
        header: "Data de ocorrência",
        accessorFn: (event: EventView) => event.occurrenceDate,
        cell: (context) => <>{formatOccurrenceDate(context.getValue() as string)}</>,
      },
      {
        id: "description",
        header: "Descrição",
        accessorFn: (event: EventView) => event.description,
        cell: (context) => <>{context.getValue()}</>,
      },
      {
        id: "ticketPrice",
        header: "Preço do ingresso",
        accessorFn: (event: EventView) => event.ticketPrice,
        cell: (context) => <>{formatTicketPrice(context.getValue() as number)}</>,
      },
      {
        id: "actions",
        header: "Ações",
        enableSorting: false,
        cell: (context) => {
          const event = context.row.original;
          const spotName = resolveSpotName(catalog, event.spotId).name;
          return (
            <EventRowActions
              event={event}
              spotName={spotName}
              onEdit={(target) => router.push(`/admin/events/${String(target.id)}/edit`)}
              onDelete={(target) => {
                setDeleteError(null);
                setDeleteState({ event: target });
              }}
            />
          );
        },
      },
    ];
  }, [catalog, router]);

  function confirmDelete() {
    if (!deleteState) return;
    setDeleteError(null);
    deleteMutation.mutate(deleteState.event.id, {
      onSuccess: () => {
        setDeleteState(null); // invalidação reflete o estado real (FR-011)
      },
      onError: (error) => {
        if (handleMutationError(error)) return;
        setDeleteError(describeEventActionFailure(failureFromError(error)));
        // listagem revalidada (onError da mutação) — estado real
      },
    });
  }

  if (eventsQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl">
        <LoadingState label="Carregando eventos…" />
      </div>
    );
  }
  if (eventsQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-start gap-3">
          <ErrorState message={describeEventActionFailure(failureFromError(eventsQuery.error))} />
          <Button
            variant="secondary"
            onClick={() => {
              void eventsQuery.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const filtersActive = spotFilter !== "all";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-title-1">Eventos</h2>
          <span className="text-body text-foreground-muted">
            {items.length} {items.length === 1 ? "evento" : "eventos"}
          </span>
        </div>
        <Button onClick={() => router.push("/admin/events/new")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo evento
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4" role="group" aria-label="Filtros da listagem">
        <label className="text-title-4 flex items-center gap-2">
          Ponto turístico
          {catalog.isPending ? (
            <select
              className="text-body h-9 rounded-md border border-border bg-surface-muted px-2"
              disabled
              aria-label="Carregando pontos turísticos"
            >
              <option>Carregando pontos…</option>
            </select>
          ) : catalog.isError ? (
            <span className="text-body text-foreground-muted">
              Catálogo de pontos indisponível — filtro desabilitado.
            </span>
          ) : (
            <select
              className="text-body h-9 rounded-md border border-border bg-surface px-2 text-foreground outline-none focus:border-primary"
              value={spotFilter === "all" ? "all" : String(spotFilter)}
              onChange={(event) => setSpotFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
            >
              <option value="all">Todos os pontos</option>
              {catalog.spots.map((spot) => (
                <option key={String(spot.id)} value={String(spot.id)}>
                  {spot.name}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <EmptyState
            message={
              filtersActive
                ? "Nenhum evento para o ponto turístico selecionado."
                : "Nenhum evento cadastrado ainda."
            }
          />
          {filtersActive ? (
            <Button
              variant="secondary"
              onClick={() => {
                setSpotFilter("all");
              }}
            >
              Limpar filtro
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => router.push("/admin/events/new")}>
              Cadastrar primeiro evento
            </Button>
          )}
        </div>
      ) : (
        <DataTable data={items} columns={columns} getRowKey={(event) => String(event.id)} />
      )}

      {deleteState ? (
        <ConfirmDeleteDialog
          title={`Remover evento de ${resolveSpotName(catalog, deleteState.event.spotId).name}?`}
          description={
            <>
              Evento em{" "}
              <strong>{resolveSpotName(catalog, deleteState.event.spotId).name}</strong> com
              ocorrência em {formatOccurrenceDate(deleteState.event.occurrenceDate)}:{" "}
              <strong>remoção permanente e irreversível</strong> — o evento deixa de existir na
              API e no app do turista.
            </>
          }
          pending={deleteMutation.isPending}
          errorMessage={deleteError}
          onConfirm={confirmDelete}
          onClose={() => setDeleteState(null)}
        />
      ) : null}
    </div>
  );
}
