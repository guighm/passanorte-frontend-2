// Classificador puro do payload unificado de erro da API FastAPI
// (SPE-02 rodada 2, T004 — remediação U1 do /speckit-analyze): módulo
// transversal (Princípio IV) consumido TANTO por `src/shared/lib/http.ts`
// (server) quanto por `src/shared/lib/bff.ts` (client) — SEM duplicação.
// Contrato: `ApiError { errorCode, message, details }`; exceção
// documentada: `HTTPValidationError { detail: [...] }` (422) ⇒
// errorCode "validation_error". 401/403 NÃO passam aqui: já
// classificados pelos callers (SessionEndedError/AuthorizationDeniedError).

import {
  ApiRequestError,
  ApiUnavailableError,
  AuthorizationDeniedError,
  ContractViolationError,
  SessionEndedError,
} from "@/features/auth/api/errors";

/** Valida o corpo e devolve o erro classificado — ou null quando o corpo
 * não é nem ApiError nem HTTPValidationError (caller lança o fallback). */
export function parseApiErrorBody(
  body: unknown,
  status: number,
): ApiRequestError | null {
  if (typeof body !== "object" || body === null) return null;
  const unified = body as {
    errorCode?: unknown;
    message?: unknown;
    details?: unknown;
    detail?: unknown;
  };
  if (typeof unified.errorCode === "string" && typeof unified.message === "string") {
    return new ApiRequestError(
      status,
      unified.errorCode,
      unified.message,
      Array.isArray(unified.details) ? unified.details : [],
    );
  }
  if (Array.isArray(unified.detail)) {
    return new ApiRequestError(
      status,
      "validation_error",
      "Dados inválidos para o endpoint.",
      unified.detail,
    );
  }
  return null;
}

/** Lê o corpo de uma resposta não-ok e lança o erro classificado (nunca
 * retorna). 401/403 devem ser classificados pelo caller antes de chamar. */
export async function classifyApiErrorResponse(
  response: Response,
  displayPath: string,
): Promise<never> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null; // sem corpo JSON — desfecho abaixo
  }
  const classified = parseApiErrorBody(body, response.status);
  if (classified) {
    throw classified;
  }
  throw new ApiUnavailableError(`HTTP ${response.status} em ${displayPath}`);
}

// -------------------------------------------------------------- falhas --

/** Kinds compartilhados de desfecho de ação (remediação I1 do
 * /speckit-analyze da SPE-03): o mapeamento de classes de erro → falha é
 * transversal (Princípio IV) — os `messages.ts` de cada feature só
 * adicionam suas mensagens pt-BR específicas via `describeActionFailure`. */
export type ActionFailureKind =
  | "api"
  | "denied"
  | "contract"
  | "unavailable"
  | "validation"
  | "session";

export interface ActionFailure {
  ok: false;
  kind: ActionFailureKind;
  status?: number;
  errorCode?: string;
  message: string;
}

/** Converte erro de mutação (classe classificada pelo túnel/bff/http) em
 * ActionFailure — SESSION (sessão encerrada) é reconhecida para o fluxo
 * /login (FR-007), nunca como "erro da ação". */
export function failureFromError(error: unknown): ActionFailure {
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
