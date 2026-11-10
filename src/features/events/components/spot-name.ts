"use client";

// Resolução spotId → nome do ponto (SPE-04 T008 — FR-012, research D6;
// T024 — converge): os eventos do contrato carregam apenas o `spotId`; o
// nome vem do catálogo COMPLETO da SPE-03 (`useSpotCatalogQuery`). TRÊS
// estados, nunca misturados:
//   - "loading": catálogo em carga — placeholder neutro (NUNCA o rótulo
//     de não-resolvido, que é reservado para ponto removido);
//   - "resolved": nome encontrado no catálogo;
//   - "unresolved": catálogo COMPLETO (isComplete) e `spotId` ausente —
//     fallback identificável "ponto turístico não encontrado"
//     (clarificação 2026-11-10, Q3): NUNCA id bruto na UI, NUNCA ocultar
//     o evento (FR-011/FR-012).

import type { SpotCatalogState } from "@/features/events/api/queries";

export const SPOT_NOT_FOUND_LABEL = "ponto turístico não encontrado";
export const SPOT_LOADING_LABEL = "Carregando…";

export type SpotNameResolution =
  | { state: "loading"; name: string }
  | { state: "resolved"; name: string }
  | { state: "unresolved"; name: string };

export function resolveSpotName(
  catalog: SpotCatalogState,
  spotId: number,
): SpotNameResolution {
  if (catalog.isPending) {
    return { state: "loading", name: SPOT_LOADING_LABEL };
  }
  const found = catalog.spots.find((spot) => spot.id === spotId);
  if (found) return { state: "resolved", name: found.name };
  // Catálogo completo e ausente ⇒ ponto removido/cascata — fallback.
  return { state: "unresolved", name: SPOT_NOT_FOUND_LABEL };
}
