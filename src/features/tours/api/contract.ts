// Parsers puros do contrato de gamificação (SPE-05 T003 — módulo
// client-safe, sem imports de bff/http; padrão `contract.ts` de
// SPE-01–04). Divergência de contrato ⇒ ContractViolationError com
// endpoint+campo — nunca dado silenciosamente aceito (Princípio I).
// `status` é string no schema estático — os valores exatos (ativa ×
// arquivada) são confirmados pelo probe P1 e NÃO restringidos aqui além
// da presença (Princípio I: só o contrato, sem inventar enum).

import { ContractViolationError } from "@/features/auth/api/errors";
import type {
  RouteListResponse,
  RoutePrizeView,
  RouteSpotEntry,
  RouteSummaryView,
  TouristRouteView,
} from "@/features/tours/types";

function violation(endpoint: string, field: string): ContractViolationError {
  return new ContractViolationError(`${endpoint}: payload fora do contrato (campo "${field}")`);
}

/** Brinde embutido em toda leitura de rota e na resposta do PATCH de estoque. */
export function parseRoutePrizeView(body: unknown, endpoint: string): RoutePrizeView {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (prize: esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const id = candidate.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    throw violation(endpoint, "prize.id");
  }
  const name = candidate.name;
  if (typeof name !== "string" || name.length < 1 || name.length > 200) {
    throw violation(endpoint, "prize.name");
  }
  const stockQuantity = candidate.stockQuantity;
  if (typeof stockQuantity !== "number" || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
    throw violation(endpoint, "prize.stockQuantity");
  }
  return { id, name, stockQuantity };
}

function parseRouteSpotEntry(body: unknown, endpoint: string, index: number): RouteSpotEntry {
  if (typeof body !== "object" || body === null) {
    throw violation(endpoint, `spots[${String(index)}]`);
  }
  const candidate = body as Record<string, unknown>;
  const spotId = candidate.spotId;
  if (typeof spotId !== "number" || !Number.isInteger(spotId) || spotId < 1) {
    throw violation(endpoint, `spots[${String(index)}].spotId`);
  }
  const displayOrder = candidate.displayOrder;
  if (typeof displayOrder !== "number" || !Number.isInteger(displayOrder) || displayOrder < 1) {
    throw violation(endpoint, `spots[${String(index)}].displayOrder`);
  }
  return { spotId, displayOrder };
}

function parseRouteSpots(values: unknown, endpoint: string): RouteSpotEntry[] {
  if (!Array.isArray(values) || values.length < 1) {
    throw violation(endpoint, "spots");
  }
  return values.map((item, index) => parseRouteSpotEntry(item, endpoint, index));
}

function parseRouteText(
  candidate: Record<string, unknown>,
  key: "name" | "description" | "status",
  endpoint: string,
  minLength: number,
  maxLength: number,
): string {
  const value = candidate[key];
  if (typeof value !== "string" || value.length < minLength || value.length > maxLength) {
    throw violation(endpoint, key);
  }
  return value;
}

/** POST/PATCH/GET {id} — detalhe completo (contrato: TouristRouteView). */
export function parseTouristRouteView(body: unknown, endpoint: string): TouristRouteView {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const id = candidate.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) throw violation(endpoint, "id");
  const name = parseRouteText(candidate, "name", endpoint, 1, 200);
  const description = parseRouteText(candidate, "description", endpoint, 1, 2000);
  const spots = parseRouteSpots(candidate.spots, endpoint);
  const prize = parseRoutePrizeView(candidate.prize, endpoint);
  const status = parseRouteText(candidate, "status", endpoint, 1, 100);
  return { id, name, description, spots, prize, status };
}

/** Item da listagem (contrato: RouteSummaryView). */
export function parseRouteSummaryView(body: unknown, endpoint: string): RouteSummaryView {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (item: esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const id = candidate.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) throw violation(endpoint, "id");
  const name = parseRouteText(candidate, "name", endpoint, 1, 200);
  const description = parseRouteText(candidate, "description", endpoint, 1, 2000);
  const spotCount = candidate.spotCount;
  if (typeof spotCount !== "number" || !Number.isInteger(spotCount) || spotCount < 1) {
    throw violation(endpoint, "spotCount");
  }
  const prize = parseRoutePrizeView(candidate.prize, endpoint);
  const status = parseRouteText(candidate, "status", endpoint, 1, 100);
  return { id, name, description, spotCount, prize, status };
}

/** GET /gamification/routes — lista única (sem paginação neste contrato). */
export function parseRouteListResponse(body: unknown, endpoint: string): RouteListResponse {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) throw violation(endpoint, "items");
  return {
    items: (candidate.items as unknown[]).map((item) => parseRouteSummaryView(item, endpoint)),
  };
}
