// Parsers puros do contrato de eventos (SPE-04 T003 — módulo client-safe,
// sem imports de bff/http; padrão `contract.ts` de SPE-02/SPE-03).
// Divergência de contrato ⇒ ContractViolationError com endpoint+campo —
// nunca dado silenciosamente aceito (Princípio I). Data de ocorrência:
// formato `YYYY-MM-DD` puro — SEM validação de período no cliente
// (clarificação 2026-11-10; backend é a autoridade de regra de negócio).

import { ContractViolationError } from "@/features/auth/api/errors";
import type { EventListResponse, EventView } from "@/features/events/types";

function violation(endpoint: string, field: string): ContractViolationError {
  return new ContractViolationError(`${endpoint}: payload fora do contrato (campo "${field}")`);
}

/** Date puro do contrato (`occurrenceDate`, format "date" — sem horário). */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Preço em JSON number; exactness do backend armazena centavos — no
 * cliente exigimos number finito ≥ 0 com NO MÁXIMO 2 casas (padrão
 * monetário do contrato, tolerância 1e-6 para artefatos de ponto
 * flutuante: 19.99*100 = 1998.9999… conta como 2 casas). O parser não
 * arredonda dado — violação é reportada (Princípio I). */
export function hasAtMostTwoDecimals(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

export function parseEventView(body: unknown, endpoint: string): EventView {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const id = candidate.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) throw violation(endpoint, "id");
  const spotId = candidate.spotId;
  if (typeof spotId !== "number" || !Number.isInteger(spotId) || spotId < 1) {
    throw violation(endpoint, "spotId");
  }
  const occurrenceDate = candidate.occurrenceDate;
  if (typeof occurrenceDate !== "string" || !DATE_PATTERN.test(occurrenceDate)) {
    throw violation(endpoint, "occurrenceDate");
  }
  const description = candidate.description;
  if (typeof description !== "string" || description.length < 1 || description.length > 2000) {
    throw violation(endpoint, "description");
  }
  const ticketPrice = candidate.ticketPrice;
  if (
    typeof ticketPrice !== "number" ||
    !Number.isFinite(ticketPrice) ||
    ticketPrice < 0 ||
    !hasAtMostTwoDecimals(ticketPrice)
  ) {
    throw violation(endpoint, "ticketPrice");
  }
  return {
    id,
    spotId,
    occurrenceDate,
    description,
    ticketPrice,
  };
}

export function parseEventListResponse(body: unknown, endpoint: string): EventListResponse {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) throw violation(endpoint, "items");
  return {
    items: (candidate.items as unknown[]).map((item) => parseEventView(item, endpoint)),
  };
}
