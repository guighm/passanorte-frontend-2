// Mapeamento de desfechos da feature tours para mensagens acionáveis
// (SPE-05 T005 — padrão attractions/employees/events). Mapeamento de
// classes→falha é TRANSVERSAL em src/shared/lib/api-error.ts (Princípio
// IV); aqui só as mensagens pt-BR de rota/brinde. `errorCode`s CONFIRMADOS
// pelo probe T004 (2026-11-10, registrado em contracts/gamification-api.md):
// resource_not_found (404 — rota desconhecida, rota ARQUIVADA em PATCH e
// ponto desconhecido/removido no create/edit — mesma mensagem do backend
// para todos), validation_error (422 — estoque negativo/não-inteiro e
// payload inválido). Caso não-observado: 422 de estoque abaixo das
// reservas comprometidas (pendência menor do probe — coberto pelo
// validation_error genérico).

export { failureFromError } from "@/shared/lib/api-error";
export type { ActionFailure as RouteActionFailure } from "@/shared/lib/api-error";
export { SESSION_ENDED_PATH } from "@/features/employees/api/messages";
import type { ActionFailure } from "@/shared/lib/api-error";

export function describeRouteActionFailure(failure: ActionFailure): string {
  switch (failure.kind) {
    case "denied":
      return "Operação não autorizada para o seu papel.";
    case "contract":
      return failure.message || "Resposta da API fora do contrato — operação abortada.";
    case "unavailable":
      return "Falha de comunicação com a API — tente novamente.";
    case "validation":
      return "Dados inválidos: revise os campos e tente novamente.";
    case "session":
      return "Sessão encerrada.";
    case "api":
      // 404 (probe: `resource_not_found`, "tourist route not found") — a
      // MESMA resposta cobre: rota desconhecida, rota ARQUIVADA em PATCH e
      // ponto turístico desconhecido/removido no create/edit (Edge Case 1
      // da spec, P2). A listagem é revalidada pela mutação (padrão SPE-03).
      if (failure.errorCode === "resource_not_found") {
        return "Rota ou ponto turístico não encontrado — pode ter sido removido ou arquivado; a listagem será atualizada.";
      }
      return failure.message || "Não foi possível concluir a operação.";
    default:
      return "Não foi possível concluir a operação.";
  }
}

/** Ajuste de estoque (RF20): 422 de guarda é do backend (Princípio II). */
export function describePrizeStockFailure(failure: ActionFailure): string {
  switch (failure.kind) {
    case "denied":
      return "Operação não autorizada para o seu papel.";
    case "contract":
      return failure.message || "Resposta da API fora do contrato — operação abortada.";
    case "unavailable":
      return "Falha de comunicação com a API — tente novamente.";
    case "validation":
      // P4: negativo/não-inteiro chega aqui com detail key stockQuantity; o
      // caso de reservas comprometidas (não observado no probe) também é
      // 422 — mensagem cobre o pedido de revisão do valor.
      return "A quantidade informada não foi aceita — informe um número inteiro maior ou igual a zero (pode estar abaixo das concessões já em andamento).";
    case "session":
      return "Sessão encerrada.";
    case "api":
      if (failure.errorCode === "resource_not_found") {
        return "Brinde não encontrado — a rota pode ter sido alterada; a listagem será atualizada.";
      }
      return failure.message || "Não foi possível ajustar o estoque.";
    default:
      return "Não foi possível ajustar o estoque.";
  }
}
