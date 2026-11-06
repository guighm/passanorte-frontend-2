// Tipos de domínio da autenticação (data-model.md da SPE-01).
// Fonte dos valores: contrato RE-CONFIRMADO por login real (2026-11-06) —
// contracts/auth-api.md; o painel NUNCA deduz papel.

/**
 * Papel superficial de navegação (RF03, Princípio II).
 *
 * Valores canônicos da API confirmados por login real (2026-11-06):
 * "admin" (administrador) e "employee" (funcionário) — correspondência
 * EXPLÍCITA e exaustiva (T040): valor fora deste enum ⇒ FALHA de sessão
 * (edge case da spec — nunca liberar acesso por omissão).
 */
export type Role = "admin" | "employee";

/**
 * Operador identificado pelo backend (data-model.md — re-confirmado 2026-11-06).
 * A identidade exibível é APENAS `username` + `role`: o contrato de
 * autenticação não devolve `id` nem `name`, e o painel nunca conhece
 * credenciais (Princípio III).
 */
export interface Operator {
  username: string;
  role: Role;
}

/**
 * Corpo 200 de POST /api/v1/auth/login e POST /api/v1/auth/refresh
 * (contracts/auth-api.md — sessão em camelCase, sem objeto `user`).
 */
export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  role: string;
}

/** Sessão local do painel vivendo exclusivamente em cookies httpOnly (FR-005). */
export interface PanelSession {
  operator: Operator;
  accessToken: string;
  refreshToken: string;
  /** Epoch (ms) em que o token vigente expira (alinhado a `expiresIn`). */
  expiresAt: number;
}

/** Resultado de getSession: null = sem sessão; expired = pode renovar (US3). */
export type SessionState =
  | { status: "active"; session: PanelSession }
  | { status: "expired"; session: PanelSession };
