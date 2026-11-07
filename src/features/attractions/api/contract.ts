// Parsers puros do contrato de pontos turísticos (SPE-03 T003 — módulo
// client-safe, sem imports de bff/http; padrão `contract.ts` da SPE-02).
// Divergência de contrato ⇒ ContractViolationError com endpoint+campo —
// nunca dado silenciosamente aceito, nunca badge inventado (Princípio I;
// enum SpotStatus FECHADO — diferença crucial vs status aberto da SPE-02).

import { ContractViolationError } from "@/features/auth/api/errors";
import {
  SPOT_STATUSES,
  type CategoryView,
  type SpotListResponse,
  type SpotScheduleEntry,
  type SpotStatus,
  type SpotView,
} from "@/features/attractions/types";

function violation(endpoint: string, field: string): ContractViolationError {
  return new ContractViolationError(`${endpoint}: payload fora do contrato (campo "${field}")`);
}

const TIME_PATTERN = /^\d{2}:\d{2}$/;

function parseScheduleEntry(entry: unknown, endpoint: string, index: number): SpotScheduleEntry {
  if (typeof entry !== "object" || entry === null) {
    throw violation(endpoint, `schedule[${index}]`);
  }
  const candidate = entry as Record<string, unknown>;
  if (typeof candidate.weekday !== "string" || candidate.weekday.length === 0) {
    throw violation(endpoint, `schedule[${index}].weekday`);
  }
  if (typeof candidate.opensAt !== "string" || !TIME_PATTERN.test(candidate.opensAt)) {
    throw violation(endpoint, `schedule[${index}].opensAt`);
  }
  if (typeof candidate.closesAt !== "string" || !TIME_PATTERN.test(candidate.closesAt)) {
    throw violation(endpoint, `schedule[${index}].closesAt`);
  }
  return {
    weekday: candidate.weekday,
    opensAt: candidate.opensAt,
    closesAt: candidate.closesAt,
  };
}

export function parseSpotView(body: unknown, endpoint: string): SpotView {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const id = candidate.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) throw violation(endpoint, "id");
  for (const field of ["name", "description"] as const) {
    if (typeof candidate[field] !== "string" || (candidate[field] as string).length === 0) {
      throw violation(endpoint, field);
    }
  }
  const latitude = candidate.latitude;
  if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
    throw violation(endpoint, "latitude");
  }
  const longitude = candidate.longitude;
  if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
    throw violation(endpoint, "longitude");
  }
  const toleranceRadiusM = candidate.toleranceRadiusM;
  if (
    toleranceRadiusM !== null &&
    (typeof toleranceRadiusM !== "number" || toleranceRadiusM <= 0)
  ) {
    throw violation(endpoint, "toleranceRadiusM");
  }
  const status = candidate.status;
  if (typeof status !== "string" || !SPOT_STATUSES.includes(status as SpotStatus)) {
    // Enum FECHADO: valor desconhecido é divergência de contrato explícita
    // (nunca badge genérico — diferença crucial vs status aberto da SPE-02).
    throw violation(endpoint, "status");
  }
  if (
    !Array.isArray(candidate.categories) ||
    candidate.categories.length === 0 ||
    candidate.categories.some((c) => typeof c !== "string" || c.length === 0)
  ) {
    throw violation(endpoint, "categories");
  }
  if (!Array.isArray(candidate.schedule)) {
    throw violation(endpoint, "schedule");
  }
  for (const created of ["createdAt", "updatedAt"] as const) {
    const value = candidate[created];
    if (typeof value !== "string" || value.length === 0 || Number.isNaN(new Date(value).getTime())) {
      throw violation(endpoint, created);
    }
  }
  const parsedSchedule = candidate.schedule.map((entry, index) => parseScheduleEntry(entry, endpoint, index));
  return {
    id,
    name: candidate.name as string,
    description: candidate.description as string,
    latitude,
    longitude,
    toleranceRadiusM: toleranceRadiusM as number | null,
    status: status as SpotView["status"],
    categories: candidate.categories as string[],
    schedule: parsedSchedule,
    createdAt: candidate.createdAt as string,
    updatedAt: candidate.updatedAt as string,
  };
}

export function parseSpotListResponse(body: unknown, endpoint: string): SpotListResponse {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) throw violation(endpoint, "items");
  for (const field of ["total", "page", "pageSize"] as const) {
    if (typeof candidate[field] !== "number" || !Number.isInteger(candidate[field])) {
      throw violation(endpoint, field);
    }
  }
  return {
    items: (candidate.items as unknown[]).map((item) => parseSpotView(item, endpoint)),
    total: candidate.total as number,
    page: candidate.page as number,
    pageSize: candidate.pageSize as number,
  };
}

/**
 * Catálogo de categorias (fonte: `/tourists/interest-categories`) —
 * FORMATO CONFIRMADO POR PROBE (2026-11-06, sessão admin real):
 * `{ "categories": [ { key, label } ] }` — chaves reais:
 * `gastronomy, nature, culture, leisure, art, cinema` com rótulos pt-BR;
 * o backend VALIDA as
 * categorias contra este catálogo (422 `request_error` com categoria
 * fora dele). Label null permanece aceito (CategoryView permite).
 */
export function parseCategoryList(body: unknown, endpoint: string): CategoryView[] {
  if (typeof body !== "object" || body === null || !Array.isArray((body as Record<string, unknown>).categories)) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado {categories: [...]})`);
  }
  const list = (body as Record<string, unknown>).categories as unknown[];
  return list.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) throw violation(endpoint, `categories[${index}]`);
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.key !== "string" || candidate.key.length === 0) {
      throw violation(endpoint, `categories[${index}].key`);
    }
    const label = candidate.label;
    if (label !== null && typeof label !== "string") {
      throw violation(endpoint, `categories[${index}].label`);
    }
    return { key: candidate.key as string, label: (label as string | null) ?? null };
  });
}
