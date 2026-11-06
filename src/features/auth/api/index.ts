// Única camada que fala com a API FastAPI de autenticação (Princípio I):
// contrato re-confirmado por login real (2026-11-06) em
// specs/001-panel-foundation-auth/contracts/auth-api.md — rotas sob
// /api/v1/ (T041), sessão camelCase e role na raiz (T039), papéis canônicos
// "admin" | "employee" (T040). Nenhum outro módulo do painel importa
// fetch para a FastAPI.

import type { Operator, Role, SessionResponse } from "@/features/auth/types";
import {
  ApiUnavailableError,
  AuthInvalidCredentialsError,
  ContractViolationError,
} from "@/features/auth/api/errors";

/** Papéis reconhecidos (enum fechado, valores exatos confirmados — T040). */
export function normalizeRole(value: string): Role | null {
  return value === "admin" || value === "employee" ? value : null;
}

/** URL base obrigatória da API (T046: modo mock removido — Princípio I). */
function apiBaseUrl(): string {
  const base = process.env.API_BASE_URL;
  if (!base) {
    throw new ApiUnavailableError("API_BASE_URL não configurada — API é o único caminho de dados (Princípio I)");
  }
  return base.replace(/\/$/, "");
}

const API_PREFIX = "/api/v1";

/**
 * Valida o corpo 200 contra o contrato confirmado (T039). Campos fora do
 * esperado são ContractViolationError (nunca reinterpretados).
 */
function parseSessionResponse(body: unknown): SessionResponse {
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError("POST /api/v1/auth/login: corpo fora do contrato confirmado");
  }
  const candidate = body as Partial<SessionResponse>;
  if (
    typeof candidate.accessToken !== "string" ||
    candidate.accessToken.length === 0 ||
    typeof candidate.refreshToken !== "string" ||
    candidate.refreshToken.length === 0 ||
    typeof candidate.expiresIn !== "number" ||
    candidate.expiresIn <= 0
  ) {
    throw new ContractViolationError("POST /api/v1/auth/login: corpo fora do contrato confirmado");
  }
  // `tokenType` é opcional no contrato (default "bearer") — ausência ≠ violação.
  return { ...body, tokenType: candidate.tokenType ?? "bearer" } as SessionResponse;
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body?.detail === "string" ? body.detail : `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/** POST /api/v1/auth/login (RF02). */
export async function login(username: string, password: string): Promise<SessionResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${API_PREFIX}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw new ApiUnavailableError("Falha de comunicação com o serviço de autenticação");
  }
  if (response.status === 401) {
    throw new AuthInvalidCredentialsError();
  }
  if (response.status === 422) {
    // Resposta DOCUMENTADA no contrato (HTTPValidationError) — não é
    // divergência; para o operador é um erro de comunicação acionável.
    throw new ApiUnavailableError(await parseErrorDetail(response));
  }
  if (!response.ok) {
    throw new ApiUnavailableError(await parseErrorDetail(response));
  }
  return parseSessionResponse(await response.json());
}

/**
 * POST /api/v1/auth/refresh (RNF09). 401/422 ⇒ null (sessão encerrada — FR-007).
 */
export async function refresh(refreshToken: string): Promise<SessionResponse | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${API_PREFIX}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw new ApiUnavailableError("Falha de comunicação com o serviço de autenticação");
  }
  if (response.status === 401 || response.status === 422) {
    return null;
  }
  if (!response.ok) {
    throw new ApiUnavailableError(await parseErrorDetail(response));
  }
  return parseSessionResponse(await response.json());
}

/**
 * POST /api/v1/auth/logout (T044 — contrato confirmado: 204).
 * 204/401 resolve (logout concluído); qualquer outra resposta é divergência
 * explícita do contrato (Princípio I) — NUNCA degradação silenciosa.
 */
export async function logout(accessToken: string | null): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${API_PREFIX}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch (error) {
    // Indisponibilidade não impede o logout local (SPE-01 US3); a falha de
    // rede é explicitada ao caller (ação local segue após aviso).
    if (error instanceof ApiUnavailableError) throw error;
    throw new ApiUnavailableError("Falha de comunicação com o serviço de autenticação");
  }
  if (response.status === 204 || response.status === 401) {
    return;
  }
  throw new ContractViolationError(
    `POST ${API_PREFIX}/auth/logout: HTTP ${response.status} diverge do contrato confirmado`,
  );
}

/**
 * GET /api/v1/auth/me (contrato confirmado — 2026-11-06) — identidade da
 * sessão vigente: `{ username, role }` (sem `id`/`name`).
 * 401 ⇒ null (o caller dispara o fluxo de renovação, FR-006/FR-007).
 */
export async function me(accessToken: string): Promise<Operator | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${API_PREFIX}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null) {
    throw new ContractViolationError("GET /api/v1/auth/me: corpo fora do contrato confirmado");
  }
  const candidate = body as Partial<Operator>;
  const role = normalizeRole(String(candidate.role ?? ""));
  if (typeof candidate.username !== "string" || role === null) {
    throw new ContractViolationError("GET /api/v1/auth/me: user fora do enum/formato do contrato");
  }
  return { username: candidate.username, role };
}
