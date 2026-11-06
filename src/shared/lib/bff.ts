// Cliente BFF transversal client-safe (SPE-02 rodada 2, T004 — research
// D10/Constraint 5): TODA chamada client-side ao backend passa
// EXCLUSIVAMENTE pelo túnel `src/app/api/proxy/[...path]` — a sessão
// continua anexada server-side (Princípio III), a renovação 401+replay é
// única no túnel e o túnel apenas TRANSPORTA o payload (nunca interpreta
// negócio — Princípio II). A classificação de respostas não-ok usa o
// MESMO classificador puro de `http.ts` (`api-error.ts` — sem duplicação).
// Nenhuma feature monta `fetch` à API por conta própria (server: http.ts,
// client: este arquivo).

import {
  AuthorizationDeniedError,
  ContractViolationError,
  SessionEndedError,
} from "@/features/auth/api/errors";
import { classifyApiErrorResponse } from "@/shared/lib/api-error";

/** URL do túnel para o caminho upstream (ex.: "api/v1/employees" →
 * "/api/proxy/api/v1/employees"). */
export function bffUrl(path: string): string {
  return `/api/proxy/${path.replace(/^\//, "")}`;
}

/**
 * Chamada pelo túnel com classificação de respostas não-ok:
 * - 401 (renovação do túnel falhou — sessão encerrada) ⇒ SessionEndedError;
 * - 403 ⇒ AuthorizationDeniedError (estado de erro da ação);
 * - demais não-ok ⇒ classificador compartilhado (`api-error.ts`).
 */
export async function bffFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(bffUrl(path), {
    ...init,
    cache: init.cache ?? "no-store",
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new SessionEndedError();
    }
    if (response.status === 403) {
      throw new AuthorizationDeniedError();
    }
    // displayPath = caminho upstream real (não o do túnel)
    await classifyApiErrorResponse(response, `/${path.replace(/^\//, "")}`);
  }
  return response;
}

/**
 * bffFetch + parse JSON protegido contra payload fora do contrato
 * (Princípio I) — mesma semântica de `apiJson` (http.ts).
 */
export async function bffJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: T }> {
  const response = await bffFetch(path, init);
  const data: unknown = await response.json().catch(() => {
    throw new ContractViolationError(`/${path.replace(/^\//, "")}: resposta sem JSON (contrato espera objeto)`);
  });
  if (typeof data !== "object" || data === null) {
    throw new ContractViolationError(`/${path.replace(/^\//, "")}: payload fora do contrato (esperado objeto JSON)`);
  }
  return { status: response.status, data: data as T };
}
