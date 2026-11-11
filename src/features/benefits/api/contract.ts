// Parsers puros do contrato de concessão (SPE-06 T004 — módulo client-safe,
// sem imports de bff/http; padrão `contract.ts` de SPE-01–05). Divergência
// de contrato ⇒ ContractViolationError com endpoint+campo — nunca dado
// silenciosamente aceito (Princípio I).
//
// Rede de desfecho (spec FR-006/data-model): o parser da validação aceita
// APENAS o preview de código CONSUMÍVEL como "conferência" —
// `enrollmentStatus !== "completed"` ou `prize.available === false` nunca
// viram conferência: desencadeiam o desfecho de falha (rota não concluída /
// sem estoque), conforme o contrato esperado. `codeStatus` só é aceito como
// "valid" (contrato §2) — qualquer outro valor é violação, não desfecho.

import { ContractViolationError } from "@/features/auth/api/errors";
import type {
  PickupSpotsResponse,
  RedemptionCreateBody,
  RedemptionOutcome,
  RedemptionPreviewView,
  RedemptionView,
} from "@/features/benefits/types";

/** Catálogo do papel (contrato esperado P6 — `GET /gamification/pickup-spots`):
 * itens com id ≥ 1 e nome 1–200. */
export function parsePickupSpots(body: unknown, endpoint: string): PickupSpotsResponse {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    throw violation(endpoint, "items");
  }
  const parsed = items.map((it, index) => {
    if (typeof it !== "object" || it === null) {
      throw violation(endpoint, `items[${index}]`);
    }
    const candidate = it as Record<string, unknown>;
    const id = candidate.id;
    if (typeof id !== "number" || !Number.isInteger(id) || id < 1) {
      throw violation(endpoint, `items[${index}].id`);
    }
    const name = candidate.name;
    if (typeof name !== "string" || name.length < 1 || name.length > 200) {
      throw violation(endpoint, `items[${index}].name`);
    }
    return { id, name };
  });
  return { items: parsed };
}

function violation(endpoint: string, field: string): ContractViolationError {
  return new ContractViolationError(`${endpoint}: payload fora do contrato (campo "${field}")`);
}

/** Corpo de validação/concessão (RedemptionCreateRequest — 1–128 + spotId ≥ 1). */
export function parseRedemptionCreateBody(body: unknown, endpoint: string): RedemptionCreateBody {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (corpo: esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const code = candidate.code;
  if (typeof code !== "string" || code.length < 1 || code.length > 128) {
    throw violation(endpoint, "code");
  }
  const spotId = candidate.spotId;
  if (typeof spotId !== "number" || !Number.isInteger(spotId) || spotId < 1) {
    throw violation(endpoint, "spotId");
  }
  return { code, spotId };
}

/** Registro da concessão (RedemptionView — contrato REAL §1). */
export function parseRedemptionView(body: unknown, endpoint: string): RedemptionView {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const code = candidate.code;
  if (typeof code !== "string" || code.length < 1 || code.length > 128) {
    throw violation(endpoint, "code");
  }
  const prize = candidate.prize;
  if (typeof prize !== "object" || prize === null) throw violation(endpoint, "prize");
  const prizeCandidate = prize as Record<string, unknown>;
  const prizeId = prizeCandidate.id;
  if (typeof prizeId !== "number" || !Number.isInteger(prizeId) || prizeId <= 0) {
    throw violation(endpoint, "prize.id");
  }
  const prizeName = prizeCandidate.name;
  if (typeof prizeName !== "string" || prizeName.length < 1 || prizeName.length > 200) {
    throw violation(endpoint, "prize.name");
  }
  const stockQuantity = prizeCandidate.stockQuantity;
  // PÓS-BAIXA — o painel reflete, nunca recomputa (Princípio II).
  if (typeof stockQuantity !== "number" || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
    throw violation(endpoint, "prize.stockQuantity");
  }
  const routeId = candidate.routeId;
  const touristId = candidate.touristId;
  const pickupSpotId = candidate.pickupSpotId;
  const concededBy = candidate.concededBy;
  const usedAt = candidate.usedAt;
  if (typeof routeId !== "number" || !Number.isInteger(routeId) || routeId <= 0) {
    throw violation(endpoint, "routeId");
  }
  if (typeof touristId !== "number" || !Number.isInteger(touristId) || touristId <= 0) {
    throw violation(endpoint, "touristId");
  }
  if (typeof pickupSpotId !== "number" || !Number.isInteger(pickupSpotId) || pickupSpotId < 1) {
    throw violation(endpoint, "pickupSpotId");
  }
  if (typeof concededBy !== "string" || concededBy.length < 1) {
    throw violation(endpoint, "concededBy");
  }
  if (typeof usedAt !== "string" || usedAt.length < 1) {
    throw violation(endpoint, "usedAt");
  }
  return {
    code,
    prize: { id: prizeId, name: prizeName, stockQuantity },
    routeId,
    touristId,
    pickupSpotId,
    concededBy,
    usedAt,
  };
}

/** Resultado da validação: conferência (código consumível) OU desfecho de
 * falha — nunca um preview não-consumível apresentado como concessionável. */
export type ValidationResolution =
  | { kind: "ready"; preview: RedemptionPreviewView }
  | { kind: "rejected"; outcome: RedemptionOutcome };

/** Preview da validação (RedemptionPreviewView — contrato ESPERADO §2). */
export function parseRedemptionPreviewView(body: unknown, endpoint: string): ValidationResolution {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError(`${endpoint}: payload fora do contrato (esperado objeto)`);
  }
  const candidate = body as Record<string, unknown>;
  const code = candidate.code;
  if (typeof code !== "string" || code.length < 1 || code.length > 128) {
    throw violation(endpoint, "code");
  }
  const codeStatus = candidate.codeStatus;
  if (codeStatus !== "valid") {
    throw violation(endpoint, "codeStatus");
  }
  const route = candidate.route;
  if (typeof route !== "object" || route === null) throw violation(endpoint, "route");
  const routeCandidate = route as Record<string, unknown>;
  const routeId = routeCandidate.id;
  if (typeof routeId !== "number" || !Number.isInteger(routeId) || routeId <= 0) {
    throw violation(endpoint, "route.id");
  }
  const routeName = routeCandidate.name;
  if (typeof routeName !== "string" || routeName.length < 1 || routeName.length > 200) {
    throw violation(endpoint, "route.name");
  }
  const enrollmentStatus = candidate.enrollmentStatus;
  if (typeof enrollmentStatus !== "string" || enrollmentStatus.length < 1) {
    throw violation(endpoint, "enrollmentStatus");
  }
  const prize = candidate.prize;
  if (typeof prize !== "object" || prize === null) throw violation(endpoint, "prize");
  const prizeCandidate = prize as Record<string, unknown>;
  const prizeId = prizeCandidate.id;
  if (typeof prizeId !== "number" || !Number.isInteger(prizeId) || prizeId <= 0) {
    throw violation(endpoint, "prize.id");
  }
  const prizeName = prizeCandidate.name;
  if (typeof prizeName !== "string" || prizeName.length < 1 || prizeName.length > 200) {
    throw violation(endpoint, "prize.name");
  }
  const stockQuantity = prizeCandidate.stockQuantity;
  if (typeof stockQuantity !== "number" || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
    throw violation(endpoint, "prize.stockQuantity");
  }
  const available = prizeCandidate.available;
  if (typeof available !== "boolean") {
    throw violation(endpoint, "prize.available");
  }
  const pickupSpotIdCandidate = candidate.pickupSpotId;
  let pickupSpotId: number | undefined;
  if (pickupSpotIdCandidate === null || pickupSpotIdCandidate === undefined) {
    pickupSpotId = undefined;
  } else if (typeof pickupSpotIdCandidate === "number" && Number.isInteger(pickupSpotIdCandidate) && pickupSpotIdCandidate >= 1) {
    pickupSpotId = pickupSpotIdCandidate;
  } else {
    throw violation(endpoint, "pickupSpotId");
  }
  const preview: RedemptionPreviewView = {
    code,
    codeStatus: "valid",
    route: { id: routeId, name: routeName },
    enrollmentStatus,
    prize: { id: prizeId, name: prizeName, stockQuantity, available },
    ...(pickupSpotId !== undefined ? { pickupSpotId } : {}),
  };
  // Rede de desfecho (data-model): só "completed" + disponível vira conferência.
  if (enrollmentStatus !== "completed") {
    return { kind: "rejected", outcome: "incomplete" };
  }
  if (!available) {
    return { kind: "rejected", outcome: "no-stock" };
  }
  return { kind: "ready", preview };
}
