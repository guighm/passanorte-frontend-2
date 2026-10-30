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

/** Sessão encerrada (refresh falhou/expirou) — dispara fluxo do FR-007. */
export class SessionEndedError extends Error {
  constructor() {
    super("Sessão encerrada.");
    this.name = "SessionEndedError";
  }
}