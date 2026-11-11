// Camada de dados client-side da feature benefits — concessão de brindes
// (SPE-06 T008 — padrão SPE-02 rodada 2 / SPE-03 / SPE-04 / SPE-05): TanStack
// Query sobre o túnel BFF (Constraint 5 — única via client-side), parsers
// puros em `contract.ts` (Princípio I).
//
// MOCK GOVERNADO ÚNICO (clarificação Q1 da spec, research D4 ampliado pelo
// probe do T005 — ver "Resultados do probe" de contracts/gamification-api.md):
// o runtime atual NÃO rotea NENHUM dos dois endpoints (`/redemptions` e
// `/redemptions/validate` 404 de rota apesar de documentados no openapi —
// deriva registrada). Enquanto `REDEMPTIONS_ENDPOINTS_LIVE = false` ambos
// resolvem via `mock.ts` (fixture fiel ao contrato), com o marcador
// `// MOCK (temporary): remove when /gamification/redemptions* is live`.
// O flip da chave acontece na task de compare de contrato (T019 —
// Governança 5), que também REMOVE `mock.ts`. Quando live:
// - concessão: `POST /gamification/redemptions` — backend efetua baixa e
//   invalida (Princípio II — o painel apenas reflete o `RedemptionView`).
// - validação: `POST /gamification/redemptions/validate` — SEM consumir.
// A validação NÃO altera estado do código nem do estoque (FR-003): não há
// o que invalidar em cache nesta feature — comentário deliberado.
// MOCK (temporary): remove when /gamification/redemptions* is live

import {
  useMutation,
  useQuery,
  type UseMutationResult,
} from "@tanstack/react-query";
import { bffJson } from "@/shared/lib/bff";
import {
  parsePickupSpots,
  parseRedemptionCreateBody,
  parseRedemptionPreviewView,
  parseRedemptionView,
  type ValidationResolution,
} from "@/features/benefits/api/contract";
import { mockConcedeCode, mockPickupSpots, mockValidateCode } from "@/features/benefits/api/mock";
import type { RedemptionCreateBody, RedemptionView } from "@/features/benefits/types";

/**
 * Chave ÚNICA do mock governado (D4/T006 — ampliada pelo probe T005):
 * flip para `true` na task de compare de contrato (T019) quando o backend
 * rotear os endpoints reais de concessão/validação/catálogo do papel.
 */
const REDEMPTIONS_ENDPOINTS_LIVE = false;

const REDEMPTIONS_PATH = "api/v1/gamification/redemptions";
const VALIDATE_PATH = "api/v1/gamification/redemptions/validate";
const PICKUP_SPOTS_PATH = "api/v1/gamification/pickup-spots";

/**
 * Validação SEM consumir o código (US1 — FR-003): resolve `ready` (dados de
 * conferência) ou `rejected` (desfecho derivado da resposta — FR-006), ou
 * lança (erros de API classificados — 404/409/422 via `ApiRequestError`).
 */
export function useValidateCodeMutation(): UseMutationResult<
  ValidationResolution,
  Error,
  RedemptionCreateBody
> {
  return useMutation({
    mutationFn: async (body: RedemptionCreateBody): Promise<ValidationResolution> => {
      parseRedemptionCreateBody({ ...body }, `/${VALIDATE_PATH}`); // defesa local (contrato)
      if (!REDEMPTIONS_ENDPOINTS_LIVE) {
        // MOCK (temporary): remove when /gamification/redemptions* is live —
        // o fixture passa pelo MESMO parser da chamada real (nenhuma tela
        // sabe se está em mock; D6 da SPE-01).
        return parseRedemptionPreviewView(mockValidateCode(body), `/${VALIDATE_PATH}`);
      }
      const { data } = await bffJson<unknown>(VALIDATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseRedemptionPreviewView(data, `/${VALIDATE_PATH}`);
    },
  });
}

/**
 * Concessão (US2 — FR-005): `POST /gamification/redemptions` — endpoint REAL
 * é a autoridade (baixa de estoque e invalidação do backend; Princípio I/II).
 * Enquanto a rota real não estiver no runtime (probe T005), resolve pelo
 * mock que replica o contrato — com a MESMA chave do compare (T019).
 */
export function useConfirmRedemptionMutation(): UseMutationResult<
  RedemptionView,
  Error,
  RedemptionCreateBody
> {
  return useMutation({
    mutationFn: async (body: RedemptionCreateBody): Promise<RedemptionView> => {
      parseRedemptionCreateBody({ ...body }, `/${REDEMPTIONS_PATH}`); // defesa local
      if (!REDEMPTIONS_ENDPOINTS_LIVE) {
        // MOCK (temporary): remove when /gamification/redemptions* is live.
        return parseRedemptionView(mockConcedeCode(body), `/${REDEMPTIONS_PATH}`);
      }
      const { data } = await bffJson<unknown>(REDEMPTIONS_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseRedemptionView(data, `/${REDEMPTIONS_PATH}`);
    },
  });
}

/** Tipo da resposta do catálogo do papel (contrato esperado P6). */
export type PickupSpotsResponse = { items: { id: number; name: string }[] };

/**
 * Catálogo de pontos de retirada do PAPEL (FR-010 — P6 do contrato): fonte
 * própria do funcionário (as rotas de listing administrativa 403 para o
 * papel — probe real). Mock governado no MESMO gate (D4+); o parser real é
 * `parsePickupSpots` em `contract.ts` (Princípio I).
 */
export function usePickupSpotCatalogQuery() {
  return useQuery({
    queryKey: ["pickup-spots"],
    queryFn: async (): Promise<PickupSpotsResponse> => {
      if (!REDEMPTIONS_ENDPOINTS_LIVE) {
        // MOCK (temporary): remove when /gamification/redemptions* is live —
        // mesma regra das demais mutações (fixture pelo parser do contrato).
        return parsePickupSpots(mockPickupSpots(), `/${PICKUP_SPOTS_PATH}`);
      }
      const { data } = await bffJson<unknown>(PICKUP_SPOTS_PATH);
      return parsePickupSpots(data, `/${PICKUP_SPOTS_PATH}`);
    },
  });
}
