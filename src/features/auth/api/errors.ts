// Erros de contrato entre o painel e a API FastAPI (Princípio I).
// Divergência de contrato NUNCA é reinterpretada silenciosamente: cada
// classe mapeia um desfecho do contrato de contracts/auth-api.md.

export class AuthInvalidCredentialsError extends Error {
  constructor() {
    super("Credenciais inválidas.");
    this.name = "AuthInvalidCredentialsError";
  }
}

export class ApiUnavailableError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "ApiUnavailableError";
  }
}

export class ContractViolationError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "ContractViolationError";
  }
}

/** 403 em chamada autorizada pelo backend — estado de erro da ação (FR-014). */
export class AuthorizationDeniedError extends Error {
  constructor() {
    super("Ação não autorizada para o papel da sessão.");
    this.name = "AuthorizationDeniedError";
  }
}

/**
 * Payload unificado `ApiError { errorCode, message, details }` do backend
 * (contrato SPE-01/SPE-02), parseado uma única vez em
 * `src/shared/lib/http.ts` (T004 — research D4): resposta de erro HTTP
 * com corpo do contrato. `errorCode` é o valor real do backend (ex.:
 * username duplicado — ver pendências de contracts/employees-api.md).
 * Exceção documentada: 422 (HTTPValidationError padrão) é normalizado
 * com errorCode "validation_error".
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly backendMessage: string;
  readonly details: unknown[];

  constructor(status: number, errorCode: string, backendMessage: string, details: unknown[] = []) {
    super(backendMessage);
    this.name = "ApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
    this.backendMessage = backendMessage;
    this.details = details;
  }
}

/** Sessão encerrada (refresh falhou/expirou) — dispara fluxo do FR-007. */
export class SessionEndedError extends Error {
  constructor() {
    super("Sessão encerrada.");
    this.name = "SessionEndedError";
  }
}