// Camada de dados client-side da feature dashboard (SPE-07 T005 — padrão
// da SPE-03): TanStack Query sobre o túnel BFF EXCLUSIVAMENTE (Constraint 5
// — nenhuma feature monta fetch à API por conta própria; token anexado
// server-side). Sob demanda (FR-020): `refetchOnWindowFocus` off e sem
// polling — refetch ao entrar (staleTime 0) e por mudança de query key;
// recarregar manual é exposto pelo próprio resultado do hook.

import { useQuery } from "@tanstack/react-query";
import { bffJson } from "@/shared/lib/bff";
import {
  parseAccessCountsResponse,
  parseHeatmapResponse,
  parseSpotRankingResponse,
  parseVisitorCountriesResponse,
  parseVisitorInterestsResponse,
} from "@/features/dashboard/api/contract";
import type {
  AccessCountsResponse,
  HeatmapResponse,
  SpotRankingResponse,
  VisitorCountriesResponse,
  VisitorInterestsResponse,
} from "@/features/dashboard/types";
import type { DateWindow, PeriodKind } from "@/features/dashboard/types/period";

const DASHBOARD_PATH = "api/v1/dashboard"; // via túnel /api/proxy/...

/** Base das keys — invalidação/refetch por card (FR-015 — independentes). */
const DASHBOARD_QUERY_KEY = ["dashboard"] as const;

const QUERY_OPTIONS = {
  refetchOnWindowFocus: false,
} as const;

function appendDates(
  params: URLSearchParams,
  window: DateWindow,
): void {
  params.set("startDate", window.startDate);
  params.set("endDate", window.endDate);
}

// ------------------------------------------------------------- leitura --

/** Mapa de calor (RF06) — `groupBy` spot|region (FR-005) + período global. */
export function useHeatmapQuery(groupBy: "spot" | "region", window: DateWindow) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "heatmap", groupBy, window.startDate, window.endDate],
    ...QUERY_OPTIONS,
    queryFn: async (): Promise<HeatmapResponse> => {
      const params = new URLSearchParams({ groupBy });
      appendDates(params, window);
      const path = `${DASHBOARD_PATH}/heatmap?${params.toString()}`;
      const { data } = await bffJson<unknown>(path);
      return parseHeatmapResponse(data, `/${DASHBOARD_PATH}/heatmap`);
    },
  });
}

/** Contador de acessos (RF07) — `period` nomeado sempre; datas apenas com
 * `custom` (contract — clarificação Q1, FR-007/FR-014). */
export function useAccessCountsQuery(
  period: PeriodKind,
  dates: { startDate: string | null; endDate: string | null },
) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "access-counts", period, dates.startDate, dates.endDate],
    ...QUERY_OPTIONS,
    queryFn: async (): Promise<AccessCountsResponse> => {
      const params = new URLSearchParams({ period });
      if (period === "custom" && dates.startDate && dates.endDate) {
        params.set("startDate", dates.startDate);
        params.set("endDate", dates.endDate);
      }
      const path = `${DASHBOARD_PATH}/access-counts?${params.toString()}`;
      const { data } = await bffJson<unknown>(path);
      return parseAccessCountsResponse(data, `/${DASHBOARD_PATH}/access-counts`);
    },
  });
}

/** Ranking (RF08) — um segmento por consulta (day|month|year) + referência
 * + limite (FR-010/FR-011). */
export function useSpotRankingQuery(
  granularity: "day" | "month" | "year",
  referenceDate: string,
  limit: number,
) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "spot-ranking", granularity, referenceDate, limit],
    ...QUERY_OPTIONS,
    queryFn: async (): Promise<SpotRankingResponse> => {
      const params = new URLSearchParams({
        granularity,
        referenceDate,
        limit: String(limit),
      });
      const path = `${DASHBOARD_PATH}/spot-ranking?${params.toString()}`;
      const { data } = await bffJson<unknown>(path);
      return parseSpotRankingResponse(data, `/${DASHBOARD_PATH}/spot-ranking`);
    },
  });
}

/** Distribuição por país de origem (RF09) — período global. */
export function useVisitorCountriesQuery(window: DateWindow) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "visitor-countries", window.startDate, window.endDate],
    ...QUERY_OPTIONS,
    queryFn: async (): Promise<VisitorCountriesResponse> => {
      const params = new URLSearchParams();
      appendDates(params, window);
      const path = `${DASHBOARD_PATH}/visitor-countries?${params.toString()}`;
      const { data } = await bffJson<unknown>(path);
      return parseVisitorCountriesResponse(data, `/${DASHBOARD_PATH}/visitor-countries`);
    },
  });
}

/** Distribuição por interesses (RF10) — período global; % sobre
 * `totalSelections` (FR-013). */
export function useVisitorInterestsQuery(window: DateWindow) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, "visitor-interests", window.startDate, window.endDate],
    ...QUERY_OPTIONS,
    queryFn: async (): Promise<VisitorInterestsResponse> => {
      const params = new URLSearchParams();
      appendDates(params, window);
      const path = `${DASHBOARD_PATH}/visitor-interests?${params.toString()}`;
      const { data } = await bffJson<unknown>(path);
      return parseVisitorInterestsResponse(data, `/${DASHBOARD_PATH}/visitor-interests`);
    },
  });
}
