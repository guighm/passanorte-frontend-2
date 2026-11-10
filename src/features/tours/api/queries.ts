// Camada de dados client-side da feature tours (SPE-05 T006 — padrão da
// SPE-02 rodada 2 / SPE-03 / SPE-04): TanStack Query sobre o túnel BFF
// (Constraint 5 — única via client-side). Listagem única SEM paginação
// (contrato, YAGNI); o alternador `includeArchived` é admin-only no
// backend. A edição carrega o DETALHE via `GET /gamification/routes/{id}`
// (contrato §1 — diferente dos eventos, que não têm endpoint de detalhe).
// O brinde é embutido: nasce no POST e muda de estoque SOMENTE pelo PATCH
// de prizes (a baixa na concessão é do backend — RF21/Princípio II).
// Catálogo de pontos reusado de `@/features/events` (research D2 —
// Princípio IV, parser/hook NÃO duplicados).

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { bffFetch, bffJson } from "@/shared/lib/bff";
import {
  parseRouteListResponse,
  parseRoutePrizeView,
  parseTouristRouteView,
} from "@/features/tours/api/contract";
import type {
  PrizeStockUpdateBody,
  RouteListResponse,
  RoutePrizeView,
  RouteCreateBody,
  RouteUpdateBody,
  TouristRouteView,
} from "@/features/tours/types";

const ROUTES_QUERY_KEY = ["routes"] as const;
const ROUTES_PATH = "api/v1/gamification/routes"; // via túnel /api/proxy/...
const PRIZES_PATH = "api/v1/gamification/prizes"; // via túnel /api/proxy/...

// ---------------------------------------------------------------- leitura --

export type RoutesFilter = { includeArchived: boolean };

export function useRoutesQuery({ includeArchived }: RoutesFilter) {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, includeArchived],
    queryFn: async (): Promise<RouteListResponse> => {
      const path = includeArchived
        ? `${ROUTES_PATH}?includeArchived=true`
        : ROUTES_PATH;
      const { data } = await bffJson<unknown>(path);
      return parseRouteListResponse(data, `/${ROUTES_PATH}`);
    },
  });
}

/**
 * Carrega a rota pelo DETALHE do contrato (GET /gamification/routes/{id})
 * — alimenta a página de edição (não há página de detalhe na UI;
 * clarificação de spec). Admin lê qualquer estado (backend nega arquivada
 * a não-admin com 404). Retorno `null` NUNCA ocorre para id válido:
 * contrato devolve 404 ⇒ erro classificado; o find guarda contra
 * payload divergente silencioso.
 */
export function useRouteQuery(routeId: number | null) {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, "detail", routeId],
    queryFn: async (): Promise<TouristRouteView | null> => {
      if (routeId === null) return null;
      const path = `${ROUTES_PATH}/${String(routeId)}`;
      const { data } = await bffJson<unknown>(path);
      const view = parseTouristRouteView(data, `/${path}`);
      return view.id === routeId ? view : null;
    },
    enabled: routeId !== null,
  });
}

// ---------------------------------------------------------------- mutações --

export function useInvalidateTours(): () => void {
  const queryClient = useQueryClient();
  return () => {
    // Invalida ["routes"] INTEIRA — as variantes com/sem arquivadas E os
    // detalhes (prefixo compartilhado), refletindo saldos/mudanças de estado.
    void queryClient.invalidateQueries({ queryKey: ROUTES_QUERY_KEY });
  };
}

export function useCreateRouteMutation(): UseMutationResult<TouristRouteView, unknown, RouteCreateBody> {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await bffJson<unknown>(ROUTES_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseTouristRouteView(data, `/${ROUTES_PATH}`);
    },
    onSuccess: invalidate,
  });
}

export interface UpdateRouteInput {
  id: number;
  /** PATCH parcial por diff (padrão SPE-04) — só o que mudou; omitido permanece. */
  body: RouteUpdateBody;
}

export function useUpdateRouteMutation(): UseMutationResult<TouristRouteView, unknown, UpdateRouteInput> {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const path = `${ROUTES_PATH}/${String(id)}`;
      const { data } = await bffJson<unknown>(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseTouristRouteView(data, `/${path}`);
    },
    onSuccess: invalidate,
  });
}

/** Arquivamento (RF19, remoção = DELETE 204 com histórico preservado —
 * Removal Decision do backend); o desfecho 404 (já arquivada em outra
 * sessão) é falha acionável e a listagem é revalidada MESMO assim (reflete
 * o estado real — padrão da remoção da SPE-03). */
export function useArchiveRouteMutation(): UseMutationResult<void, unknown, number> {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: async (routeId) => {
      await bffFetch(`${ROUTES_PATH}/${String(routeId)}`, { method: "DELETE" });
    },
    onSuccess: invalidate,
    onError: invalidate, // 404/arquivada: reflete o estado real da listagem
  });
}

export interface UpdatePrizeStockInput {
  prizeId: number;
  body: PrizeStockUpdateBody;
}

/** Ajuste de estoque do brinde (RF20 — PATCH /prizes/{id}); saldos das
 * listagens são refletidos pela invalidação (o valor exibido É sempre o
 * retornado pela API — nenhuma baixa/calculo no cliente, FR-004). */
export function useUpdatePrizeStockMutation(): UseMutationResult<RoutePrizeView, unknown, UpdatePrizeStockInput> {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: async ({ prizeId, body }) => {
      const path = `${PRIZES_PATH}/${String(prizeId)}`;
      const { data } = await bffJson<unknown>(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseRoutePrizeView(data, `/${path}`);
    },
    onSuccess: invalidate,
  });
}

// --------------------------------------------------- reuso entre features --

export {
  // Reuso cross-feature sancionado (research D2 — mesmo formato da SPE-04):
  // o catálogo completo da SPE-03 alimenta o seletor do formulário de rota
  // e a resolução spotId → nome da edição (FR-013).
  useSpotCatalogQuery,
  type SpotCatalogState,
  type SpotCatalogSpot,
} from "@/features/events/api/queries";
