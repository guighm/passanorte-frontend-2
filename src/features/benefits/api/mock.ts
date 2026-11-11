// MOCK (temporary): remove when /gamification/redemptions* is live
//
// Fixture fiel ao contrato de gamification/redemptions (SPE-06 T006 —
// contracts/gamification-api.md §1+§2, research D4 ampliado pelo probe do
// T005): o runtime atual NÃO rotea NENHUM dos dois endpoints (validação e
// concessão 404 de rota apesar de documentados no openapi.json — ver
// "Resultados do probe" do contrato). O mesmo mecanismo de mock governado
// da SPE-01 (D6) cobre os dois, com UMA chave em `queries.ts`
// (REDEMPTIONS_ENDPOINTS_LIVE): nenhuma tela sabe se está em mock.
//
// `errorCode`s seguem o baseline registrado no probe: `resource_not_found`
// (404), `conflict` (409 — valor real observado em outra rota do backend).
// Sub-casos de 409 (já utilizado × sem estoque) não são distinguíveis por
// errorCode genérico — o DESFECHO do mock replica a semântica esperada do
// contrato (estado por código) e o refinamento final acontece no compare
// de contrato (T019/Governança 5). A CONCESSão MOCKADA replica o contrato:
// 201 consome o código e deduz o estoque (a baixa/invalidação reais são
// SEMPRE do backend — Princípio II — o mock só mantém o painel dev utilizável).

import { ApiRequestError } from "@/features/auth/api/errors";
import type { RedemptionCreateBody, RedemptionPreviewView, RedemptionView } from "@/features/benefits/types";

/** Fixture consumível — código da rota de fixture do posto (US1/US2). */
export const MOCK_REDEEMABLE_CODES = new Set<string>(["PASSNORTE-ROTA-1"]);

/** Catálogo do papel (P6 — contrato esperado `GET /gamification/pickup-spots`):
 * fixture reduzida de pontos de retirada ativos (dois postos de fixture). */
export function mockPickupSpots(): { items: { id: number; name: string }[] } {
  return {
    items: [
      { id: 1, name: "Posto de fixture — Centro" },
      { id: 2, name: "Posto de fixture — Teatro" },
    ],
  };
}

/** Código de fixture com brinde SEM estoque (desfecho FR-007 — código
 * PERMANECE válido). */
export const MOCK_NO_STOCK_CODES = new Set<string>(["PASSNORTE-ROTA-SEM-ESTOQUE"]);

/** Estado do mock POR SESSÃO DE PÁGINA (módulo client-side): códigos já
 * consumidos pela concessão mockada. */
const consumed = new Set<string>();

function unknownCode(): ApiRequestError {
  // 404 — código desconhecido/malformado (baseline do probe: resource_not_found).
  return new ApiRequestError(404, "resource_not_found", "Not Found");
}

/** Validação SEM consumir (contrato esperado §2 — RedemptionPreviewView). */
export function mockValidateCode(body: RedemptionCreateBody): RedemptionPreviewView {
  if (consumed.has(body.code)) {
    throw new ApiRequestError(409, "conflict", "redemption code already used");
  }
  if (MOCK_REDEEMABLE_CODES.has(body.code)) {
    return {
      code: body.code,
      codeStatus: "valid",
      route: { id: 1, name: "Rota de fixture do posto" },
      enrollmentStatus: "completed",
      prize: { id: 1, name: "Brinde de fixture", stockQuantity: 5, available: true },
    };
  }
  if (MOCK_NO_STOCK_CODES.has(body.code)) {
    return {
      code: body.code,
      codeStatus: "valid",
      route: { id: 2, name: "Rota de fixture sem estoque" },
      enrollmentStatus: "completed",
      prize: { id: 2, name: "Brinde de fixture esgotado", stockQuantity: 0, available: false },
    };
  }
  throw unknownCode();
}

/** Concessão MOCKADA que replica o contrato §1 (201 consome o código e
 * deduz o estoque — painel dev; autoridade real é o backend). */
export function mockConcedeCode(body: RedemptionCreateBody): RedemptionView {
  if (consumed.has(body.code)) {
    throw new ApiRequestError(409, "conflict", "redemption code already used");
  }
  if (MOCK_NO_STOCK_CODES.has(body.code)) {
    // 409 sem estoque — o código PERMANECE válido (desfecho registrado;
    // não consumir é o comportamento esperado do backend — FR-007).
    throw new ApiRequestError(409, "conflict", "insufficient prize stock");
  }
  if (!MOCK_REDEEMABLE_CODES.has(body.code)) {
    throw unknownCode();
  }
  consumed.add(body.code);
  const now = new Date().toISOString();
  return {
    code: body.code,
    prize: { id: 1, name: "Brinde de fixture", stockQuantity: 4 }, // 5 -> 4 (pós-baixa)
    routeId: 1,
    touristId: 1,
    pickupSpotId: body.spotId,
    concededBy: "mock-posto",
    usedAt: now,
  };
}
