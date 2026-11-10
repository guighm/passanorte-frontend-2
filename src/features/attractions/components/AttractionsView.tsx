"use client";

// Wrapper client da listagem de pontos turísticos (SPE-03 T008 — padrão
// AttractionsView/employees da SPE-02): TanStack Query + túnel BFF; filtro
// por status server-side (query refetch com página 1), filtro por categoria
// client-side sobre a página carregada (limitação do contrato — FR-004),
// paginação server-side (FR-006), estados distintos (Princípio V/SC-006)
// e orquestração dos diálogos (cadastro/edição/remoção).

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import Button from "@/shared/components/Button";
import DataTable, { type DataTableColumnDef } from "@/shared/components/DataTable";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { SessionEndedError } from "@/features/auth/api/errors";
import {
  SPOT_PAGE_SIZE,
  useDeleteSpotMutation,
  useInvalidateSpots,
  useSpotsQuery,
  useSpotCategoriesQuery,
} from "@/features/attractions/api/queries";
import {
  describeActionFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/attractions/api/messages";
import SpotStatusBadge, { spotStatusLabel } from "@/features/attractions/components/SpotStatusBadge";
import SpotFormDialog from "@/features/attractions/components/SpotFormDialog";
import ConfirmDeleteDialog from "@/shared/components/ConfirmDeleteDialog";
import RowActions from "@/features/attractions/components/RowActions";
import {
  SPOT_STATUSES,
  type SpotStatus,
  type SpotView,
} from "@/features/attractions/types";

type FormState = { mode: "create" } | { mode: "edit"; spot: SpotView } | null;
type DeleteState = { spot: SpotView } | null;

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatSpotDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return dateTimeFormat.format(parsed);
  return value;
}

export default function AttractionsView() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SpotStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formState, setFormState] = useState<FormState>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const spotsQuery = useSpotsQuery({ page, status: statusFilter });
  const categoriesQuery = useSpotCategoriesQuery();
  const deleteMutation = useDeleteSpotMutation();
  const invalidateSpots = useInvalidateSpots();

  useEffect(() => {
    if (spotsQuery.error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH);
    }
  }, [spotsQuery.error, router]);

  function handleMutationError(error: unknown): boolean {
    if (error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // FR-007 — não é "erro da ação"
      return true;
    }
    return false;
  }

  const categoryOptions = categoriesQuery.data ?? [];

  const columns = useMemo<DataTableColumnDef<SpotView>[]>(() => [
    { accessorKey: "name", header: "Nome" },
    {
      id: "categories",
      accessorKey: "categories",
      header: "Categorias",
      enableSorting: false,
      cell: ({ row }) => {
        // Rótulos do catálogo (pt) para keys conhecidas; key cru como
        // fallback honesto de exibição (nunca categoria inventada).
        const labels = row.original.categories.map((key) => {
          const option = categoryOptions.find((c) => c.key === key);
          return option?.label ?? key;
        });
        return <span className="text-body text-foreground-muted">{labels.join(", ")}</span>;
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <SpotStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      enableSorting: false,
      cell: ({ row }) => formatSpotDate(row.original.createdAt),
    },
    {
      accessorKey: "updatedAt",
      header: "Atualizado em",
      enableSorting: false,
      cell: ({ row }) => formatSpotDate(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "Ações",
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          spot={row.original}
          onEdit={(spot) => setFormState({ mode: "edit", spot })}
          onDelete={(spot) => {
            setDeleteError(null);
            setDeleteState({ spot });
          }}
        />
      ),
    },
  ], [categoryOptions]);

  // Filtro por categoria: CLIENT-side sobre a página carregada (limitação
  // do contrato — FR-004/research D4; nunca fingido de server-side).
  const filteredItems = useMemo(() => {
    const items = spotsQuery.data?.items ?? [];
    return categoryFilter === "all"
      ? items
      : items.filter((spot) => spot.categories.includes(categoryFilter));
  }, [spotsQuery.data, categoryFilter]);

  const total = spotsQuery.data?.total ?? 0;
  const pageSize = spotsQuery.data?.pageSize ?? SPOT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function applyStatusFilter(next: SpotStatus | "all") {
    setStatusFilter(next);
    setPage(1); // filtro novo começa na primeira página
  }

  function confirmDelete() {
    if (!deleteState) return;
    setDeleteError(null);
    deleteMutation.mutate(deleteState.spot.id, {
      onSuccess: () => {
        setDeleteState(null); // invalidação reflete o estado real (FR-007)
      },
      onError: (error) => {
        if (handleMutationError(error)) return;
        setDeleteError(describeActionFailure(failureFromError(error)));
        // listagem revalidada (onError da mutação) — reflete estado real
      },
    });
  }

  // Primeira localização da página vigente = centro inicial do picker no
  // cadastro (FR-009 — nada fixado no código, RNF06; senão visão padrão).
  const fallbackCenter = useMemo(() => {
    const first = spotsQuery.data?.items[0];
    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
  }, [spotsQuery.data]);

  if (spotsQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl">
        <LoadingState label="Carregando pontos turísticos…" />
      </div>
    );
  }
  if (spotsQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-start gap-3">
          <ErrorState message={describeActionFailure(failureFromError(spotsQuery.error))} />
          <Button
            variant="secondary"
            onClick={() => {
              void spotsQuery.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const filtersActive = statusFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-title-1">Pontos turísticos</h2>
          <span className="text-body text-foreground-muted">
            {total} no total
          </span>
        </div>
        <Button onClick={() => setFormState({ mode: "create" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo ponto
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4" role="group" aria-label="Filtros da listagem">
        <label className="text-title-4 flex items-center gap-2">
          Status
          <select
            className="text-body h-9 rounded-md border border-border bg-surface px-2 text-foreground outline-none focus:border-primary"
            value={statusFilter}
            onChange={(event) => applyStatusFilter(event.target.value as SpotStatus | "all")}
          >
            <option value="all">Todos</option>
            {SPOT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {spotStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-title-4 flex items-center gap-2">
          Categoria
          {categoryFilter === "all" && categoriesQuery.isPending ? (
            <select className="text-body h-9 rounded-md border border-border bg-surface-muted px-2" disabled>
              <option>Carregando catálogo…</option>
            </select>
          ) : categoriesQuery.isError ? (
            <Button variant="secondary" className="h-9 px-2" onClick={() => categoriesQuery.refetch()}>
              Catálogo indisponível — tentar novamente
            </Button>
          ) : (
            <select
              className="text-body h-9 rounded-md border border-border bg-surface px-2 text-foreground outline-none focus:border-primary"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">Todas</option>
              {categoryOptions.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label ?? category.key}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>

      {spotsQuery.data && spotsQuery.data.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <EmptyState message="Nenhum ponto turístico cadastrado ainda." />
          <Button variant="secondary" onClick={() => setFormState({ mode: "create" })}>
            Cadastrar primeiro ponto
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <EmptyState message="Nenhum ponto para o filtro aplicado." />
          {filtersActive ? (
            <Button
              variant="secondary"
              onClick={() => {
                applyStatusFilter("all");
                setCategoryFilter("all");
                void invalidateSpots();
              }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <DataTable
            data={filteredItems}
            columns={columns}
            getRowKey={(spot) => String(spot.id)}
          />
          <div className="flex items-center gap-3" aria-label="Controles de paginação">
            <Button
              variant="secondary"
              className="h-8 px-3"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <span className="text-body text-foreground-muted">
              Página {spotsQuery.data.page} de {totalPages} ({total} pontos)
            </span>
            <Button
              variant="secondary"
              className="h-8 px-3"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        </>
      )}

      {formState ? (
        <SpotFormDialog
          key={formState.mode === "edit" ? `edit-${formState.spot.id}` : "create"}
          mode={formState.mode}
          spot={formState.mode === "edit" ? formState.spot : undefined}
          fallbackCenter={fallbackCenter}
          onSaved={() => {
            setFormState(null); // invalidação reflete na listagem (FR-007)
          }}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {deleteState ? (
        <ConfirmDeleteDialog
          title={`Remover ${deleteState.spot.name}?`}
          description={
            <>
              Esta é uma <strong>remoção permanente e irreversível</strong>: o ponto sai do
              catálogo da cidade, do app do turista e das rotas/dashboard que dependam dele.
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
