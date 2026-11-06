// Mapeamento de desfechos de Server Functions para mensagens acionáveis de
// UI em português (SPE-02 FR-014/FR-016 — Princípio V). Os kinds vêm das
// Server Functions (actions/index.ts), que classificam o erro uma única vez
// server-side (research D2/D4). Mensagens técnicas do backend não chegam
// cruas ao operador.

export type EmployeeActionKind = "api" | "denied" | "contract" | "unavailable" | "validation";

export interface EmployeeActionFailure {
  ok: false;
  kind: EmployeeActionKind;
  status?: number;
  errorCode?: string;
  backendMessage?: string;
  message: string;
}

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
      return failure.message || "Resposta da API fora do contrato — operação abortada.";
    case "unavailable":
      return "Falha de comunicação com a API — tente novamente.";
    case "validation":
      return "Dados inválidos: revise os campos e tente novamente.";
    case "api":
      if (failure.errorCode && isDuplicateUsernameCode(failure.errorCode)) {
        return "Este nome de usuário já está em uso por outro funcionário.";
      }
      return failure.message || "Não foi possível concluir a operação.";
    default:
      return "Não foi possível concluir a operação.";
  }
}

/** Mensagem para erros durante a RENDERIZAÇÃO server-side (page.tsx):
 * mesmas classes de src/features/auth/api/errors, mapeadas por instanceof. */
export function describeApiError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  switch (name) {
    case "AuthorizationDeniedError":
      return "Operação não autorizada para o seu papel.";
    case "ContractViolationError":
      return "Resposta da API fora do contrato — exibição abortada.";
    case "ApiUnavailableError":
      return "Falha de comunicação com a API — tente novamente.";
    case "ApiRequestError":
      return (error as { backendMessage?: string }).backendMessage || "Não foi possível obter os dados.";
    default:
      return "Não foi possível concluir a operação.";
  }
}

/** Detalhe técnico opcional (aparece discreto dentro do ErrorState). */
export function apiErrorDetail(error: unknown): string {
  const detail = (error as { message?: string } | null)?.message;
  return typeof detail === "string" ? detail : "";
}
