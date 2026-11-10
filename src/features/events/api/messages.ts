// Mapeamento de desfechos da feature events para mensagens acionáveis
// (SPE-04 FR-010 — padrão attractions/employees). Mapeamento de
// classes→falha é TRANSVERSAL em src/shared/lib/api-error.ts (Princípio
// IV); aqui só as mensagens pt-BR de evento. `errorCode`s CONFIRMADOS
// pelo probe T004 (2026-11-10, registrado em contracts/events-api.md):
// resource_not_found (404), conflict (409 — ponto permanentemente fechado),
// validation_error (422 via parser de "validation_error" do classificador).

export { failureFromError } from "@/shared/lib/api-error";
export type { ActionFailure as EventActionFailure } from "@/shared/lib/api-error";
export { SESSION_ENDED_PATH } from "@/features/employees/api/messages";
import type { ActionFailure } from "@/shared/lib/api-error";

export function describeEventActionFailure(failure: ActionFailure): string {
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
      // 404 (probe: `resource_not_found`, "event or tourist spot not
      // found"): evento (ou ponto-alvo) removido/inexistente — a listagem
      // é revalidada pela mutação (padrão da remoção, SPE-03).
      if (failure.errorCode === "resource_not_found") {
        return "Evento não encontrado — ele pode ter sido removido; a listagem será atualizada.";
      }
      // 409 (probe: `conflict`, "tourist spot is permanently closed") —
      // eventos não podem ser vinculados a ponto fechado permanentemente.
      if (failure.errorCode === "conflict") {
        return "Ponto turístico fechado permanentemente — não é possível vincular eventos a ele.";
      }
      return failure.message || "Não foi possível concluir a operação.";
    default:
      return "Não foi possível concluir a operação.";
  }
}
