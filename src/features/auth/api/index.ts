// Única camada que fala com a API FastAPI de autenticação (Princípio I):
// contrato baseline em specs/001-panel-foundation-auth/contracts/auth-api.md
// (enquanto o Swagger real não existe; ver research.md D6).
// Nenhum outro módulo do painel importa fetch para a FastAPI.

import type { LoginResponse, Operator, Role } from "@/features/auth/types";
import {
  ApiUnavailableError,
  AuthInvalidCredentialsError,
  ContractViolationError,
} from "@/features/auth/api/errors";
import { mockLogin, mockLogout, mockMe, mockRefresh } from "@/features/auth/api/mock";

export interface LogoutResult {
  /** Texto de divergência de contrato quando o endpoint não existe (F2/F2-análise). */
  contractDivergence?: string;
}

const API_BASE_URL = process.env.API_BASE_URL ?? "";

/** Papéis reconhecidos (enum fechado — data-model.md). */
export function normalizeRole(value: string): Role | null {
  const canonical = value.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (canonical === "administrador" || canonical === "funcionario") {
    return canonical;
  }
  return null;
}

/**
 * Valida o corpo 200 contra o baseline do contrato. Campos fora do
 * esperado são ContractViolationError (nunca reinterpretados).
 */
function parseLoginResponse(body: unknown): LoginResponse {
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as LoginResponse).access_token !== "string" ||
    typeof (body as LoginResponse).refresh_token !== "string" ||
    typeof (body as LoginResponse).expires_in !== "number" ||
    typeof (body as LoginResponse).user !== "object" ||
    (body as LoginResponse).user === null
  ) {
    throw new ContractViolationError("POST /auth/login: corpo fora do baseline do contrato");
  }
  const { user } = body as LoginResponse;
  const role = normalizeRole(String((user as Operator).role ?? ""));
  if (
    typeof (user as Operator).id !== "string" ||
    typeof (user as Operator).name !== "string" ||
    role === null
  ) {
    throw new ContractViolationError("POST /auth/login: user.role fora do enum do contrato");
  }
  const parsed = body as LoginResponse;
  return { ...parsed, user: { ...(user as Operator), role } };
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body?.detail === "string" ? body.detail : `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * POST /auth/login (RF02). 401 ⇒ AuthInvalidCredentialsError; rede/5xx ⇒
 * ApiUnavailableError; corpo desviante ⇒ ContractViolationError.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  if (!API_BASE_URL) {
    return parseLoginResponse(mockLogin(username, password));
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
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
  if (!response.ok) {
    throw new ApiUnavailableError(await parseErrorDetail(response));
  }
  return parseLoginResponse(await response.json());
}

/**
 * POST /auth/refresh (RNF09). 401/422 ⇒ null (sessão encerrada — FR-007).
 */
export async function refresh(refreshToken: string): Promise<LoginResponse | null> {
  if (!API_BASE_URL) {
    const renewed = mockRefresh(refreshToken);
    return renewed ? parseLoginResponse(renewed) : null;
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
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
  return parseLoginResponse(await response.json());
}

/**
 * POST /auth/logout — 204 resolve; 401 resolve (já encerrada); endpoint
 * inexistente (404/405) resolve com anotação de divergência (análise F2).
 */
export async function logout(accessToken: string | null): Promise<LogoutResult> {
  if (!API_BASE_URL) {
    if (accessToken) {
      mockLogout(accessToken); // 204 fixture; valida opacidade do token
    }
    return {};
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    // Indisponibilidade não impede o logout local (SPE-01 US3).
    return {};
  }
  if (response.ok || response.status === 401) {
    return {};
  }
  if (response.status === 404 || response.status === 405) {
    return {
      contractDivergence: `POST /auth/logout não existente no backend (HTTP ${response.status})`,
    };
  }
  return {};
}

/**
 * GET /auth/me (opicional no contrato — a confirmar no Swagger real).
 * 401 ⇒ null (o caller dispara o fluxo de renovação, FR-006/FR-007).
 */
export async function me(accessToken: string): Promise<Operator | null> {
  if (!API_BASE_URL) {
    return mockMe(accessToken);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/me`, {
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
    throw new ContractViolationError("GET /auth/me: corpo fora do baseline do contrato");
  }
  const candidate = body as Operator;
  const role = normalizeRole(String(candidate.role ?? ""));
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || role === null) {
    throw new ContractViolationError("GET /auth/me: user fora do enum/formato do contrato");
  }
  return { ...candidate, role };
}