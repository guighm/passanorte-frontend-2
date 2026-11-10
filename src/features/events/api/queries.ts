// Camada de dados client-side da feature events (SPE-04 T007 — padrão da
// SPE-02 rodada 2 / SPE-03): TanStack Query sobre o túnel BFF (Constraint
// 5 — única via client-side). O contrato de eventos NÃO TEM paginação
// (lista única, ordem `(occurrenceDate, id)` da API respeitada) e NÃO
// TEM endpoint de detalhe: `useEventQuery(eventId)` localiza o evento na
// MESMA lista (base `["events"]` — research D2). O catálogo de pontos é
// LAÇO de todas as páginas da listagem paginada da SPE-03 (FR-006 —
// nunca seletor parcial), reusando os parsers de `@/features/attractions`
// (Princípio IV — parser NÃO duplicado, research D6).

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { bffFetch, bffJson } from "@/shared/lib/bff";
import { parseSpotListResponse } from "@/features/attractions/api/contract";
import { parseEventListResponse, parseEventView } from "@/features/events/api/contract";
import type {
  EventCreateBody,
  EventListResponse,
  EventUpdateBody,
  EventView,
} from "@/features/events/types";

const EVENTS_QUERY_KEY = ["events"] as const;
const EVENTS_PATH = "api/v1/events"; // via túnel /api/proxy/...
const SPOTS_PATH = "api/v1/tourist-spots"; // via túnel — catálogo p/ FR-006

/** Máximo do contrato da listagem de spots (`pageSize` ≤ 100); o valor
 * EFETIVO é confirmado pelo probe T004 (pendência 5). */
export const SPOT_CATALOG_PAGE_SIZE_MAX = 100;

// ---------------------------------------------------------------- leitura --

export type EventsFilter = { spotId: number | null };

export function useEventsQuery({ spotId }: EventsFilter) {
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, spotId],
    queryFn: async (): Promise<EventListResponse> => {
      const path =
        spotId !== null ? `${EVENTS_PATH}?spotId=${String(spotId)}` : EVENTS_PATH;
      const { data } = await bffJson<unknown>(path);
      return parseEventListResponse(data, `/${EVENTS_PATH}`);
    },
  });
}

/**
 * Edição (research D2): o contrato não expõe `GET /events/{id}` — o
 * evento é localizado na LISTA (sem paginação). Deriva do cache `["events"]`
 * quando presente; refetch garante dado fresco. `undefined` enquanto não
 * localizado (a UI decide: loading vs "não encontrado").
 */
export function useEventQuery(eventId: number | null) {
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, "detail", eventId],
    queryFn: async (): Promise<EventView | null> => {
      const { data } = await bffJson<unknown>(EVENTS_PATH);
      const items = parseEventListResponse(data, `/${EVENTS_PATH}`).items;
      return items.find((event) => event.id === eventId) ?? null;
    },
    enabled: eventId !== null,
  });
}

/**
 * Catálogo COMPLETO de pontos para o seletor e a resolução de nomes
 * (FR-006, D6): laço de todas as páginas (`pageSize` do contrato) —
 * habilitação da seleção exige o catálogo integral. Cache próprio
 * `["spot-catalog"]` (desconectado de `["spots"]` da SPE-03 — research D6;
 * data-model).
 */
export interface SpotCatalogState {
  spots: SpotCatalogSpot[];
  isPending: boolean;
  isError: boolean;
  /** Completo apenas quando o laço terminou sem erro (FR-006). */
  isComplete: boolean;
  /** Nova tentativa (Princípio V — estados de erro acionáveis). */
  refetch: () => void;
}

export interface SpotCatalogSpot {
  id: number;
  name: string;
}

export function useSpotCatalogQuery(): SpotCatalogState {
  const query = useQuery({
    queryKey: ["spot-catalog"],
    staleTime: 0, // revalida ao remontar (limitação aceita — data-model)
    queryFn: async (): Promise<SpotCatalogSpot[]> => {
      // Laço até esgotar: página com menos itens que o pageSize indica fim
      // (critério confirmável pelo probe T004 — pendência 5 do contrato).
      const pageSize = SPOT_CATALOG_PAGE_SIZE_MAX;
      const collected: SpotCatalogSpot[] = [];
      for (let page = 1; ; page += 1) {
        const path = `${SPOTS_PATH}?page=${String(page)}&pageSize=${String(pageSize)}`;
        const { data } = await bffJson<unknown>(path);
        const response = parseSpotListResponse(data, `/${SPOTS_PATH}`);
        for (const spot of response.items) {
          collected.push({ id: spot.id, name: spot.name });
        }
        if (response.items.length < pageSize) break;
      }
      return collected;
    },
  });
  return {
    spots: (query.data ?? []) as SpotCatalogSpot[],
    isPending: query.isPending,
    isError: query.isError,
    isComplete: query.isSuccess, // sucesso ⇒ laço terminou ⇒ completo
    refetch: () => {
      void query.refetch();
    },
  };
}

// ---------------------------------------------------------------- mutações --

export function useInvalidateEvents(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
  };
}

export function useCreateEventMutation(): UseMutationResult<EventView, unknown, EventCreateBody> {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await bffJson<unknown>(EVENTS_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseEventView(data, `/${EVENTS_PATH}`);
    },
    onSuccess: invalidate,
  });
}

export interface UpdateEventInput {
  id: number;
  /** PATCH parcial por diff (D8) — só o que mudou; omitido permanece. */
  body: EventUpdateBody;
}

export function useUpdateEventMutation(): UseMutationResult<EventView, unknown, UpdateEventInput> {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const path = `${EVENTS_PATH}/${String(id)}`;
      const { data } = await bffJson<unknown>(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseEventView(data, `/${path}`);
    },
    onSuccess: invalidate,
  });
}

/** Remoção física (RF17): DELETE 204; não-ok (401/403/demais) lançado por
 * bffFetch; o desfecho 404 (evento já removido em outra sessão) é falha
 * acionável — e a listagem é revalidada MESMO assim (reflete estado real,
 * padrão da remoção da SPE-03). */
export function useDeleteEventMutation(): UseMutationResult<void, unknown, number> {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (id) => {
      await bffFetch(`${EVENTS_PATH}/${String(id)}`, { method: "DELETE" });
    },
    onSuccess: invalidate,
    onError: invalidate, // 404/removido: reflete o estado real da listagem
  });
}
