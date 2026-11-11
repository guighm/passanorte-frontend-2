// Parsers puros do contrato Dashboard (SPE-07 T004 — Princípio I): módulo
// client-safe, sem imports de bff/http (padrão `contract.ts` da SPE-02/03).
// Divergência de contrato ⇒ `ContractViolationError` com endpoint+campo —
// NUNCA dado silenciosamente aceito (FR-016). Arrays mantêm a ordem da API
// (contract rule 2 — NUNCA reordenar no cliente).

import { ContractViolationError } from "@/features/auth/api/errors";
import type {
  AccessCountsResponse,
  CountryShareItem,
  HeatmapMarker,
  HeatmapResponse,
  InterestShareItem,
  RankingItem,
  SpotRankingResponse,
  VisitorCountriesResponse,
  VisitorInterestsResponse,
} from "@/features/dashboard/types";

const DASHBOARD_TAG = "/api/v1/dashboard";

function violation(endpoint: string, field: string): ContractViolationError {
  return new ContractViolationError(
    `${endpoint}: payload fora do contrato (campo "${field}")`,
  );
}

/** Espera objeto; divergência é violação explícita (http/bff sem objeto). */
function asObject(body: unknown, endpoint: string): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(
      `${endpoint}: payload fora do contrato (esperado objeto)`,
    );
  }
  return body as Record<string, unknown>;
}

function expectArray(value: unknown, endpoint: string, field: string): unknown[] {
  if (!Array.isArray(value)) throw violation(endpoint, field);
  return value;
}

/** Inteiro com faixa fechada [min, ∞) — NaN/Infinity excluídos por
 * Number.isInteger. */
function expectInt(
  value: unknown,
  endpoint: string,
  field: string,
  min = 0,
  max = Number.POSITIVE_INFINITY,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw violation(endpoint, field);
  }
  return value;
}

function expectString(value: unknown, endpoint: string, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw violation(endpoint, field);
  return value;
}

/** Percentual do contrato: number 0–100 (não exige inteiro). */
function expectShare(value: unknown, endpoint: string, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw violation(endpoint, field);
  }
  return value;
}

/** Número finito (coordenadas lat/lng são fracionários no contrato). */
function expectFinite(
  value: unknown,
  endpoint: string,
  field: string,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw violation(endpoint, field);
  }
  return value;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function expectISODate(value: unknown, endpoint: string, field: string): string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw violation(endpoint, field);
  }
  return value;
}

// ------------------------------------------------------------ heatmap --

function parseHeatmapMarker(entry: unknown, index: number): HeatmapMarker {
  const endpoint = `${DASHBOARD_TAG}/heatmap`;
  if (typeof entry !== "object" || entry === null) throw violation(endpoint, `markers[${index}]`);
  const candidate = entry as Record<string, unknown>;
  const spotId = candidate.spotId;
  // Contract: int | null — null marca REGIÃO (groupBy=region, FR-005).
  const spotIdValid =
    spotId === null ||
    (typeof spotId === "number" && Number.isInteger(spotId) && spotId > 0);
  if (!spotIdValid) throw violation(endpoint, `markers[${index}].spotId`);
  return {
    spotId: spotId as number | null,
    name: expectString(candidate.name, endpoint, `markers[${index}].name`),
    latitude: expectFinite(candidate.latitude, endpoint, `markers[${index}].latitude`, -90, 90),
    longitude: expectFinite(
      candidate.longitude,
      endpoint,
      `markers[${index}].longitude`,
      -180,
      180,
    ),
    weight: expectInt(candidate.weight, endpoint, `markers[${index}].weight`),
  };
}

/** GET /dashboard/heatmap → `HeatmapResponse { markers }` na ordem da API. */
export function parseHeatmapResponse(body: unknown, endpoint = `${DASHBOARD_TAG}/heatmap`): HeatmapResponse {
  const candidate = asObject(body, endpoint);
  const markers = expectArray(candidate.markers, endpoint, "markers").map(parseHeatmapMarker);
  return { markers };
}

// ------------------------------------------------------- access-counts --

function parseDailyCount(entry: unknown, index: number) {
  const endpoint = `${DASHBOARD_TAG}/access-counts`;
  if (typeof entry !== "object" || entry === null) throw violation(endpoint, `daily[${index}]`);
  const candidate = entry as Record<string, unknown>;
  return {
    date: expectISODate(candidate.date, endpoint, `daily[${index}].date`),
    uniqueTourists: expectInt(
      candidate.uniqueTourists,
      endpoint,
      `daily[${index}].uniqueTourists`,
    ),
    accessEvents: expectInt(candidate.accessEvents, endpoint, `daily[${index}].accessEvents`),
  };
}

/** GET /dashboard/access-counts (RF07) — série ascendente de dias COM
 * eventos; zeros legítimos de janela vazia chegam como 0/0/[] (data-model). */
export function parseAccessCountsResponse(
  body: unknown,
  endpoint = `${DASHBOARD_TAG}/access-counts`,
): AccessCountsResponse {
  const candidate = asObject(body, endpoint);
  return {
    period: expectString(candidate.period, endpoint, "period"),
    uniqueTouristDays: expectInt(candidate.uniqueTouristDays, endpoint, "uniqueTouristDays"),
    totalAccessEvents: expectInt(candidate.totalAccessEvents, endpoint, "totalAccessEvents"),
    daily: expectArray(candidate.daily, endpoint, "daily").map(parseDailyCount),
  };
}

// --------------------------------------------------------- spot-ranking --

function parseRankingItem(entry: unknown, index: number): RankingItem {
  const endpoint = `${DASHBOARD_TAG}/spot-ranking`;
  if (typeof entry !== "object" || entry === null) throw violation(endpoint, `items[${index}]`);
  const candidate = entry as Record<string, unknown>;
  return {
    position: expectInt(candidate.position, endpoint, `items[${index}].position`, 1),
    spotId: expectInt(candidate.spotId, endpoint, `items[${index}].spotId`, 1),
    name: expectString(candidate.name, endpoint, `items[${index}].name`),
    visits: expectInt(candidate.visits, endpoint, `items[${index}].visits`, 1),
  };
}

/** GET /dashboard/spot-ranking (RF08) — linhas em ordem de `position`. */
export function parseSpotRankingResponse(
  body: unknown,
  endpoint = `${DASHBOARD_TAG}/spot-ranking`,
): SpotRankingResponse {
  const candidate = asObject(body, endpoint);
  const granularity = expectString(candidate.granularity, endpoint, "granularity");
  const referenceDate =
    candidate.referenceDate === null
      ? null
      : expectISODate(candidate.referenceDate, endpoint, "referenceDate");
  return {
    granularity,
    referenceDate,
    items: expectArray(candidate.items, endpoint, "items").map(parseRankingItem),
  };
}

// -------------------------------------------- visitor-countries/interests --

function parseCountryShare(entry: unknown, index: number): CountryShareItem {
  const endpoint = `${DASHBOARD_TAG}/visitor-countries`;
  if (typeof entry !== "object" || entry === null) throw violation(endpoint, `items[${index}]`);
  const candidate = entry as Record<string, unknown>;
  return {
    country: expectString(candidate.country, endpoint, `items[${index}].country`),
    tourists: expectInt(candidate.tourists, endpoint, `items[${index}].tourists`),
    share: expectShare(candidate.share, endpoint, `items[${index}].share`),
  };
}

/** GET /dashboard/visitor-countries (RF09). */
export function parseVisitorCountriesResponse(
  body: unknown,
  endpoint = `${DASHBOARD_TAG}/visitor-countries`,
): VisitorCountriesResponse {
  const candidate = asObject(body, endpoint);
  return {
    totalVisitors: expectInt(candidate.totalVisitors, endpoint, "totalVisitors"),
    items: expectArray(candidate.items, endpoint, "items").map(parseCountryShare),
  };
}

function parseInterestShare(entry: unknown, index: number): InterestShareItem {
  const endpoint = `${DASHBOARD_TAG}/visitor-interests`;
  if (typeof entry !== "object" || entry === null) throw violation(endpoint, `items[${index}]`);
  const candidate = entry as Record<string, unknown>;
  return {
    interestKey: expectString(candidate.interestKey, endpoint, `items[${index}].interestKey`),
    interestLabel: expectString(
      candidate.interestLabel,
      endpoint,
      `items[${index}].interestLabel`,
    ),
    tourists: expectInt(candidate.tourists, endpoint, `items[${index}].tourists`),
    share: expectShare(candidate.share, endpoint, `items[${index}].share`),
  };
}

/** GET /dashboard/visitor-interests (RF10) — % sobre `totalSelections`. */
export function parseVisitorInterestsResponse(
  body: unknown,
  endpoint = `${DASHBOARD_TAG}/visitor-interests`,
): VisitorInterestsResponse {
  const candidate = asObject(body, endpoint);
  return {
    totalVisitors: expectInt(candidate.totalVisitors, endpoint, "totalVisitors"),
    totalSelections: expectInt(candidate.totalSelections, endpoint, "totalSelections"),
    items: expectArray(candidate.items, endpoint, "items").map(parseInterestShare),
  };
}
