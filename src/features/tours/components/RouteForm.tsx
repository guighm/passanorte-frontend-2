"use client";

// Formulário dedicado de rota (SPE-05 T008/T013 — clarificação Q1: páginas
// dedicadas; sem wizard). RHF + Zod espelhando o contrato: name 1–200,
// description 1–2000, spots mínimo 1 (lista reordenável T007), brinde
// EMBUTIDO no cadastro (prize.name 1–200 + initialStock int ≥ 0 — FR-005).
// Em edição (T013): carregado pelo DETALHE do contrato (useRouteQuery),
// brinde apenas-leitura (nasce com a rota — FR-008/D4), PATCH por diff
// (só campos alterados; `spots` reordenada enviada completa e revalidada
// no backend — min 1). Rota arquivada na edição ⇒ somente-leitura sem
// salvar (backend nega com 404 — probe P1: status "archived"). Botão em
// progresso trava duplo envio; falhas da API acionáveis com dados
// preservados (FR-014); sessão encerrada ⇒ login (padrão SPE-02–04).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import Button from "@/shared/components/Button";
import { SessionEndedError } from "@/features/auth/api/errors";
import {
  useCreateRouteMutation,
  useSpotCatalogQuery,
  useUpdateRouteMutation,
} from "@/features/tours/api/queries";
import {
  describeRouteActionFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/tours/api/messages";
import RouteSpotList, { type RouteSpotListEntry } from "@/features/tours/components/RouteSpotList";
import {
  initialStockSchema,
  prizeNameSchema,
  routeDescriptionSchema,
  routeNameSchema,
  routeSpotsSchema,
} from "@/features/tours/types/schemas";
import type {
  RouteUpdateBody,
  TouristRouteView,
} from "@/features/tours/types";

export type RouteFormMode = { mode: "create" } | { mode: "edit"; route: TouristRouteView };

/** Valor do `status` de rota arquivada — CONFIRMADO pelo probe P1
 * (contracts/gamification-api.md: "active" | "archived"). */
const ARCHIVED_ROUTE_STATUS = "archived";

/** Valores crus do formulário (entradas como texto; spots é estado próprio
 * da lista — fora do RHF, com validação própria no submit). */
type RawFormValues = {
  name: string;
  description: string;
  prizeName: string;
  initialStock: string;
};

const INPUT_CLASSES =
  "text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary";

function sortSpots(route: TouristRouteView): RouteSpotListEntry[] {
  return [...route.spots]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((entry) => ({ spotId: entry.spotId }));
}

/** Resolver RHF: validação de texto pelo schema (Zod), erros campo a campo
 * (FR-007). Campos de brinde SÓ obrigatórios no create (edit: apenas-leitura). */
function buildRawResolver(mode: RouteFormMode["mode"]): Resolver<RawFormValues> {
  const rawSchema = z.object({
    name: routeNameSchema,
    description: routeDescriptionSchema,
    ...(mode === "create"
      ? { prizeName: prizeNameSchema, initialStock: initialStockSchema }
      : {}),
  });
  return async (raw) => {
    const candidate = {
      name: raw.name,
      description: raw.description,
      ...(mode === "create"
        ? {
            prizeName: raw.prizeName,
            initialStock:
              raw.initialStock.trim() === ""
                ? Number.NaN
                : Number(raw.initialStock.trim()),
          }
        : {}),
    };
    const parsed = rawSchema.safeParse(candidate);
    if (parsed.success) return { values: raw, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0] ?? "")] = { type: "validation", message: issue.message };
    }
    return { values: {}, errors };
  };
}

export default function RouteForm({ mode }: { mode: RouteFormMode }) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  // Prefill da lista ordenada na montagem (lazy init — sem setState em effect).
  const [spots, setSpots] = useState<RouteSpotListEntry[]>(() =>
    mode.mode === "edit" ? sortSpots(mode.route) : [],
  );
  const [spotsError, setSpotsError] = useState<string | null>(null);

  const current = mode.mode === "edit" ? mode.route : null;
  const isArchived = current !== null && current.status === ARCHIVED_ROUTE_STATUS;
  const readOnly = isArchived; // arquivada: somente-leitura (D5/probe P1)

  const createMutation = useCreateRouteMutation();
  const updateMutation = useUpdateRouteMutation();
  const catalog = useSpotCatalogQuery(); // reuso cross-feature (research D2)

  const resolver = useMemo(() => buildRawResolver(mode.mode), [mode.mode]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RawFormValues>({
    resolver,
    defaultValues: current
      ? { name: current.name, description: current.description, prizeName: current.prize.name, initialStock: "" }
      : { name: "", description: "", prizeName: "", initialStock: "" },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  function serializeSpots(entries: RouteSpotListEntry[]) {
    return entries.map((entry, index) => ({ spotId: entry.spotId, displayOrder: index + 1 }));
  }

  function handleMutationError(error: unknown): boolean {
    if (error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // sessão encerrada — não é "erro da ação"
      return true;
    }
    setFailure(describeRouteActionFailure(failureFromError(error)));
    return false;
  }

  async function onSubmit(raw: RawFormValues) {
    setFailure(null);
    // O resolver já validou os textos; spots validados aqui (estado próprio).
    const spotsCheck = routeSpotsSchema.safeParse(serializeSpots(spots));
    if (!spotsCheck.success) {
      setSpotsError(spotsCheck.error.issues[0]?.message ?? "Adicione ao menos um ponto turístico.");
      return;
    }
    setSpotsError(null);

    if (mode.mode === "create") {
      try {
        await createMutation.mutateAsync({
          name: raw.name.trim(),
          description: raw.description.trim(),
          spots: spotsCheck.data,
          prize: {
            name: raw.prizeName.trim(),
            initialStock: Number(raw.initialStock.trim()),
          },
        });
        router.push("/admin/tours"); // listagem reflete sem reload (invalidação)
      } catch (error) {
        handleMutationError(error); // falha acionável; dados preservados
      }
      return;
    }

    // PATCH por diff (padrão SPE-04): apenas campos alterados; omitted permanece.
    const body: RouteUpdateBody = {};
    if (raw.name.trim() !== current?.name) body.name = raw.name.trim();
    if (raw.description.trim() !== current?.description) body.description = raw.description.trim();
    const originalSpots = current ? serializeSpots(sortSpots(current)) : [];
    if (JSON.stringify(spotsCheck.data) !== JSON.stringify(originalSpots)) {
      body.spots = spotsCheck.data; // lista alterada/reordenada — completa + validada
    }
    if (Object.keys(body).length === 0) {
      router.push("/admin/tours"); // nada mudou — voltar sem PATCH
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: current!.id, body });
      router.push("/admin/tours");
    } catch (error) {
      handleMutationError(error);
    }
  }

  // Erro do catálogo bloqueia o submit (a lista ordenada não é montável) e
  // é renderizado pela RouteSpotList com nova tentativa (Princípio V).
  const catalogBlocks = catalog.isError;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      noValidate
    >
      {failure ? (
        <div role="alert" className="text-body rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
          {failure}
        </div>
      ) : null}

      {isArchived ? (
        <div role="status" className="text-body rounded-md bg-surface-muted px-3 py-2 text-foreground-muted">
          Esta rota está <strong>arquivada</strong> — somente-leitura em
          edição (o backend nega a alteração com 404).
        </div>
      ) : null}

      <label className="text-title-4 flex flex-col gap-1" htmlFor="route-name">
        Nome da rota
        <input
          id="route-name"
          type="text"
          autoComplete="off"
          maxLength={200}
          disabled={readOnly}
          className={INPUT_CLASSES}
          {...register("name")}
        />
        {errors.name ? (
          <span className="text-body text-danger" role="alert">
            {errors.name.message}
          </span>
        ) : null}
      </label>

      <label className="text-title-4 flex flex-col gap-1" htmlFor="route-description">
        Descrição
        <textarea
          id="route-description"
          rows={4}
          maxLength={2000}
          disabled={readOnly}
          className="text-body rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
          {...register("description")}
        />
        {errors.description ? (
          <span className="text-body text-danger" role="alert">
            {errors.description.message}
          </span>
        ) : null}
      </label>

      <RouteSpotList
        entries={spots}
        onChange={(next) => {
          setSpots(next);
          setSpotsError(null);
        }}
        catalog={catalog}
        errorMessage={spotsError}
      />

      {mode.mode === "create" ? (
        <fieldset className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-3">
          <legend className="text-title-4">Brinde de conclusão da rota</legend>
          <p className="text-body text-foreground-muted">
            O brinde nasce com a rota e o nome não pode ser alterado depois —
            o estoque é ajustado pela listagem de rotas (ação na linha).
          </p>
          <label className="text-title-4 flex flex-col gap-1" htmlFor="prize-name">
            Nome do brinde
            <input
              id="prize-name"
              type="text"
              autoComplete="off"
              maxLength={200}
              className={INPUT_CLASSES}
              {...register("prizeName")}
            />
            {errors.prizeName ? (
              <span className="text-body text-danger" role="alert">
                {errors.prizeName.message}
              </span>
            ) : null}
          </label>
          <label className="text-title-4 flex flex-col gap-1" htmlFor="prize-stock">
            Estoque inicial
            <input
              id="prize-stock"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={INPUT_CLASSES}
              {...register("initialStock")}
            />
            {errors.initialStock ? (
              <span className="text-body text-danger" role="alert">
                {errors.initialStock.message}
              </span>
            ) : null}
          </label>
        </fieldset>
      ) : (
        /* Edit: brinde apenas-leitura com apontamento (FR-008/D4). */
        <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-muted p-3">
          <p className="text-title-4">
            Brinde da rota: <strong>{current?.prize.name}</strong>
          </p>
          <p className="text-body text-foreground-muted">
            O brinde não é editável (nasce com a rota). Ajuste o estoque pela
            listagem de rotas (ação na linha).
          </p>
        </div>
      )}

      {mode.mode === "edit" ? (
        <p className="text-body text-foreground-muted">
          Somente os campos alterados são enviados ao backend (PATCH parcial).
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={pending || isSubmitting}
          onClick={() => router.push("/admin/tours")}
        >
          Cancelar
        </Button>
        {!readOnly ? (
          <Button type="submit" disabled={pending || isSubmitting || catalogBlocks}>
            {pending || isSubmitting
              ? "Salvando…"
              : mode.mode === "create"
                ? "Criar rota"
                : "Salvar alterações"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
