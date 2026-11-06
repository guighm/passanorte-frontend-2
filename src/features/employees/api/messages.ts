// Mapeamento de desfechos para mensagens acionáveis de UI em português
// (SPE-02 FR-014/FR-016 — Princípio V). Client-safe: os erros chegam das
// mutações TanStack Query (queries.ts) como classes de
// src/features/auth/api/errors.ts (classificadas pelo túnel/bff.ts) e são
// mapeados aqui uma única vez. Mensagens técnicas do backend nunca chegam
// cruas ao operador; a credencial nunca entra neste mapeamento (SC-002).

import {
  ApiRequestError,
  ApiUnavailableError,
  AuthorizationDeniedError,
  ContractViolationError,
  SessionEndedError,
} from "@/features/auth/api/errors";

export type EmployeeActionKind =
  | "api"
  | "denied"
  | "contract"
  | "unavailable"
  | "validation"
  | "session";

export interface EmployeeActionFailure {
  ok: false;
  kind: EmployeeActionKind;
  status?: number;
  errorCode?: string;
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

/** Converte o erro lançado por uma mutação TanStack Query (classe
 * classificada pelo túnel/bff.ts) em EmployeeActionFailure — a sessão
 * encerrada é reconhecida para o fluxo /login (FR-007) sem virar
 * "erro da ação" (Princípio I). */
export function failureFromError(error: unknown): EmployeeActionFailure {
  if (error instanceof ApiRequestError) {
    return {
      ok: false,
      kind: error.errorCode === "validation_error" ? "validation" : "api",
      status: error.status,
      errorCode: error.errorCode,
      message: error.backendMessage,
    };
  }
  if (error instanceof AuthorizationDeniedError) {
    return { ok: false, kind: "denied", message: "Ação não autorizada para o papel da sessão." };
  }
  if (error instanceof ContractViolationError) {
    return { ok: false, kind: "contract", message: error.message };
  }
  if (error instanceof ApiUnavailableError) {
    return { ok: false, kind: "unavailable", message: error.message };
  }
  if (error instanceof SessionEndedError) {
    return { ok: false, kind: "session", message: "Sessão encerrada." };
  }
  return { ok: false, kind: "api", message: "Falha inesperada ao falar com a API." };
}

export const SESSION_ENDED_PATH = "/login?reason=session-expired";
