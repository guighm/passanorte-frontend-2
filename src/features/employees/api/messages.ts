// Mapeamento de desfechos da feature employees para mensagens acionáveis
// (SPE-02 FR-014/FR-016). Mapeamento de classes→falha é TRANSVERSAL em
// src/shared/lib/api-error.ts (remediação I1 da SPE-03 — Princípio IV);
// este módulo só adiciona as mensagens pt-BR da feature.

import type { ActionFailure } from "@/shared/lib/api-error";

export type EmployeeActionKind = ActionFailure["kind"];
export type EmployeeActionFailure = ActionFailure;

export { failureFromError } from "@/shared/lib/api-error";
export const SESSION_ENDED_PATH = "/login?reason=session-expired";

/** Erro desconhecido do backend — mensagem genérica acionável (nunca
 * "badge inventado"). O probe T005 fixará codes reais; enquanto isso,
 * heurística de texto para duplicados cobre os formatos comuns. */
function isDuplicateUsernameCode(errorCode: string): boolean {
  return /dupl|taken|conflict|already|exist|usado/i.test(errorCode);
}

export function describeActionFailure(failure: EmployeeActionFailure): string {
  switch (failure.kind) {
    case "denied":
      return "Operação não autorizada para o seu papel.";
    case "contract":
      return "Resposta da API fora do contrato — operação abortada.";
    case "unavailable":
      return "Falha de comunicação com a API — tente novamente.";
    case "validation":
      return "Dados inválidos: revise os campos e tente novamente.";
    case "session":
      return "Sessão encerrada.";
    case "api":
      if (failure.errorCode && isDuplicateUsernameCode(failure.errorCode)) {
        return "Este nome de usuário já está em uso por outro funcionário.";
      }
      return failure.message || "Não foi possível concluir a operação.";
    default:
      return "Não foi possível concluir a operação.";
  }
}
