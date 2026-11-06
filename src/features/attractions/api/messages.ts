// Mapeamento de desfechos da feature attractions para mensagens acionáveis
// (SPE-03 FR-014/FR-016 — padrão da SPE-02). Mapeamento de classes→falha é
// TRANSVERSAL em src/shared/lib/api-error.ts (remediação I1 — Princípio IV);
// aqui só as mensagens pt-BR de spot.

export { failureFromError } from "@/shared/lib/api-error";
export type { ActionFailure as AttractionActionFailure } from "@/shared/lib/api-error";
export { SESSION_ENDED_PATH } from "@/features/employees/api/messages";
import type { ActionFailure } from "@/shared/lib/api-error";

export function describeActionFailure(failure: ActionFailure): string {
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
      if (failure.errorCode === "not_found" || /not[_ ]?found|inexistente/i.test(failure.errorCode ?? failure.message)) {
        return "Ponto turístico não encontrado — a listagem será atualizada.";
      }
      return failure.message || "Não foi possível concluir a operação.";
    default:
      return "Não foi possível concluir a operação.";
  }
}
