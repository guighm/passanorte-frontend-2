// Camada de dados client-side da feature attractions (SPE-03 T006 —
// research D1): TanStack Query sobre o túnel BFF (Constraint 5 — única via
// client-side). Cache por página/ filtro (["spots", page, status]) e
// catálogo próprio; mutações invalidam (FR-007 — nada otimista confirmado).

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { bffFetch, bffJson } from "@/shared/lib/bff";
import {
  parseCategoryList,
  parseSpotListResponse,
  parseSpotView,
} from "@/features/attractions/api/contract";
import {
  SPOT_STATUS_OPEN,
  type SpotCreateBody,
  type SpotListResponse,
  type SpotStatus,
  type SpotUpdateBody,
  type SpotView,
} from "@/features/attractions/types";

const SPOTS_QUERY_KEY = ["spots"] as const;
const SPOTS_PATH = "api/v1/tourist-spots"; // via túnel /api/proxy/...
const CATEGORIES_PATH = "api/v1/tourists/interest-categories";
/** Tamanho de página exibido e enviado à API (paginação server-side, FR-006). */
export const SPOT_PAGE_SIZE = 20;

// ---------------------------------------------------------------- leitura --

export type SpotsFilter = { page: number; status: SpotStatus | "all" };

export function useSpotsQuery({ page, status }: SpotsFilter) {
  return useQuery({
    queryKey: [...SPOTS_QUERY_KEY, page, status],
    queryFn: async (): Promise<SpotListResponse> => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(SPOT_PAGE_SIZE) });
      if (status !== "all") {
        params.set("status", status);
      }
      const { data } = await bffJson<unknown>(`${SPOTS_PATH}?${params.toString()}`);
      return parseSpotListResponse(data, `/${SPOTS_PATH}`);
    },
  });
}

/** Catálogo de categorias (fonte DECIDIDA: interesses do turista —
 * clarificação 2026-11-06; correspondência de chaves confirmada pelo
 * probe T004). Cache próprio, estados de erro/retry próprios do seletor. */
export function useSpotCategoriesQuery() {
  return useQuery({
    queryKey: ["spot-categories"],
    queryFn: async () => {
      const { data } = await bffJson<unknown>(CATEGORIES_PATH);
      return parseCategoryList(data, `/${CATEGORIES_PATH}`);
    },
  });
}

// ---------------------------------------------------------------- mutações --

export function useInvalidateSpots(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: SPOTS_QUERY_KEY });
  };
}

export function useCreateSpotMutation(): UseMutationResult<SpotView, unknown, SpotCreateBody> {
  const invalidate = useInvalidateSpots();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await bffJson<unknown>(SPOTS_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseSpotView(data, `/${SPOTS_PATH}`);
    },
    onSuccess: invalidate,
  });
}

export interface UpdateSpotInput {
  id: number;
  body: SpotUpdateBody;
}

export function useUpdateSpotMutation(): UseMutationResult<SpotView, unknown, UpdateSpotInput> {
  const invalidate = useInvalidateSpots();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const path = `${SPOTS_PATH}/${id}`;
      const { data } = await bffJson<unknown>(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseSpotView(data, `/${path}`);
    },
    onSuccess: invalidate,
  });
}

/** Remoção permanente (RF12): DELETE 204; não-ok (401/403/demais) lançado
 * por bffFetch; o desfecho 404 (spot já removido) é falha acionável — e a
 * listagem é revalidada MESMO assim (reflete estado real, US4.3). */
export function useDeleteSpotMutation(): UseMutationResult<void, unknown, number> {
  const invalidate = useInvalidateSpots();
  return useMutation({
    mutationFn: async (id) => {
      await bffFetch(`${SPOTS_PATH}/${id}`, { method: "DELETE" });
    },
    onSuccess: invalidate,
    onError: invalidate, // 404/removido: reflete o estado real da listagem
  });
}

/** Status padrão do formulário (explícito no corpo — o default do backend
 * é observado no probe, mas o painel NÃO depende de default alheio). */
export function defaultSpotStatus(): SpotStatus {
  return SPOT_STATUS_OPEN;
}
