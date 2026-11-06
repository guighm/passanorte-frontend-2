// Cliente HTTP compartilhado da API FastAPI (FR-015, Princípio I):
// toda feature (SPE-02..07) consome apiFetch/apiJson — nenhum outro módulo
// monta chamadas à API por si só. Uso server-side (Server Components,
// Server Functions, Route Handlers): o token de autorização é anexado
// APENAS aqui, a partir da sessão httpOnly (FR-005, Princípio III).
//
// Nota de fronteira: este é o único arquivo em src/shared que alcança
// features/auth (sessão + erros) — sessão é transversal por design
// (contracts/panel-session.md).

import { redirect } from "next/navigation";
import {
  ApiRequestError,
  ApiUnavailableError,
  AuthorizationDeniedError,
  ContractViolationError,
  SessionEndedError,
} from "@/features/auth/api/errors";
import { getSession } from "@/features/auth/session";
import { refreshSession } from "@/features/auth/session/refresh";

const API_BASE_URL = process.env.API_BASE_URL ?? "";

function assertConfigured(): string {
  if (!API_BASE_URL) {
    throw new ApiUnavailableError("API_BASE_URL não configurada — endpoints de negócio ainda sem modo real");
  }
  return API_BASE_URL;
}

async function requestWithSession(
  url: string,
  init: RequestInit,
  accessToken: string,
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
    signal: init.signal ?? AbortSignal.timeout(12000),
    cache: init.cache ?? "no-store",
  });
}

/**
 * Chamada à API FastAPI com anexo automático da sessão e renovação única
 * em 401 (replay da requisição original — US3 cenários 1 e 4).
 * - Sem sessão ou renovação encerrada ⇒ SessionEndedError (FR-007/FR-009).
 * - 403 ⇒ AuthorizationDeniedError (estado de erro da ação — FR-014).
 * - Sessão expirada com refresh válido ⇒ renovação transparente.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = assertConfigured();
  const state = await getSession();
  if (!state) {
    throw new SessionEndedError();
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  let response = await requestWithSession(url, init, state.session.accessToken);
  if (response.status === 401) {
    const renewed = await refreshSession();
    if (!renewed) {
      throw new SessionEndedError(); // renovação falhou — sessão encerrada (FR-007)
    }
    response = await requestWithSession(url, init, renewed.accessToken);
    if (response.status === 401) {
      throw new SessionEndedError(); // token reemitido inválido — não retentar (FR-007)
    }
  }
  if (response.status === 403) {
    throw new AuthorizationDeniedError();
  }
  return response;
}

/**
 * Classifica uma resposta HTTP não-ok a partir do corpo (T004 — research
 * D4, ponto ÚNICO de classificação de erro — Princípio I):
 * - corpo `ApiError { errorCode, message, details }` ⇒ ApiRequestError;
 * - corpo `HTTPValidationError { detail: [...] }` (exceção documentada do
 *   FastAPI, 422) ⇒ ApiRequestError com errorCode "validation_error";
 * - sem corpo/corpo inesperado ⇒ ApiUnavailableError (semântica anterior).
 * 401/403 NÃO chegam aqui: já classificados em apiFetch.
 */
export async function throwApiErrorResponse(
  response: Response,
  path: string,
): Promise<never> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null; // sem corpo JSON — desfecho abaixo
  }
  if (typeof body === "object" && body !== null) {
    const unified = body as { errorCode?: unknown; message?: unknown; details?: unknown; detail?: unknown };
    if (typeof unified.errorCode === "string" && typeof unified.message === "string") {
      throw new ApiRequestError(
        response.status,
        unified.errorCode,
        unified.message,
        Array.isArray(unified.details) ? unified.details : [],
      );
    }
    if (Array.isArray(unified.detail)) {
      // HTTPValidationError padrão do FastAPI (exceção documentada ao ApiError)
      throw new ApiRequestError(response.status, "validation_error", "Dados inválidos para o endpoint.", unified.detail);
    }
  }
  throw new ApiUnavailableError(`HTTP ${response.status} em ${path}`);
}

/** apiFetch + parse JSON protegido contra payload fora do contrato (Princípio I).
 * Respostas não-ok são classificadas em um único ponto (throwApiErrorResponse). */
export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: T }> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    await throwApiErrorResponse(response, path);
  }
  const data: unknown = await response.json().catch(() => {
    throw new ContractViolationError(`${path}: resposta sem JSON (contrato espera objeto)`);
  });
  if (typeof data !== "object" || data === null) {
    throw new ContractViolationError(`${path}: payload fora do contrato (esperado objeto JSON)`);
  }
  return { status: response.status, data: data as T };
}

/**
 * Hook para Server Functions (FR-007, T026): quando um erro é de sessão
 * encerrada, redireciona ao login com o aviso de sessão encerrada
 * (banner de T014). Retorna true se o erro era de sessão (caller pode
 * ignorar o resto do tratamento).
 */
export function redirectToLoginIfSessionEnded(error: unknown): boolean {
  if (!(error instanceof SessionEndedError)) {
    return false;
  }
  // redirect() lança a exceção de navegação do Next (nunca retorna aqui)
  redirect("/login?reason=session-expired");
}