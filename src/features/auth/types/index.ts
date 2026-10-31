// Tipos de domínio da autenticação (data-model.md da SPE-01).
// Fonte dos valores: resposta da API FastAPI — o painel NUNCA deduz papel.

/**
 * Papel superficial de navegação (RF03, Princípio II).
 *
 * Forma canônica interna: sem acento/diacrítico ("funcionario"), pois
 * `normalizeRole` adapta a valor devolvido pela API ("funcionário") para a
 * comparação — é normalização de entrada do contrato, não dedução de papel:
 * valor fora do enum após normalização é FALHA de sessão (edge case da spec).
 */
export type Role = "administrador" | "funcionario";

/** Operador identificado pelo backend (data-model.md). Sem credenciais. */
export interface Operator {
  id: string;
  username: string;
  name: string;
  role: Role;
}

/** Corpo 200 de POST /auth/login e POST /auth/refresh (contracts/auth-api.md). */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: Operator;
}

/** Sessão local do painel vivendo exclusivamente em cookies httpOnly (FR-005). */
export interface PanelSession {
  operator: Operator;
  accessToken: string;
  refreshToken: string;
  /** Epoch (ms) em que o token vigente expira (alinhado a `expires_in`). */
  expiresAt: number;
}

/** Resultado de getSession: null = sem sessão; expired = pode renovar (US3). */
export type SessionState =
  | { status: "active"; session: PanelSession }
  | { status: "expired"; session: PanelSession };