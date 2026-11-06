// Classificador puro do payload unificado de erro da API FastAPI
// (SPE-02 rodada 2, T004 — remediação U1 do /speckit-analyze): módulo
// transversal (Princípio IV) consumido TANTO por `src/shared/lib/http.ts`
// (server) quanto por `src/shared/lib/bff.ts` (client) — SEM duplicação.
// Contrato: `ApiError { errorCode, message, details }`; exceção
// documentada: `HTTPValidationError { detail: [...] }` (422) ⇒
// errorCode "validation_error". 401/403 NÃO passam aqui: já
// classificados pelos callers (SessionEndedError/AuthorizationDeniedError).

import { ApiRequestError, ApiUnavailableError } from "@/features/auth/api/errors";

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
