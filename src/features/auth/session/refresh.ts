// Renovação coordenada da sessão (US3, FR-006/FR-007): UMA única chamada
// de refresh por ciclo de expiração — requisições simultâneas aguardam o
// mesmo resultado (US3 cenário 4 / SC-003). Falha de renovação encerra a
// sessão (FR-007); NUNCA retrata renovação indefinidamente.

import { refresh } from "@/features/auth/api";
import type { PanelSession } from "@/features/auth/types";
import { clearSession, getSession, setSession } from "@/features/auth/session";

let inFlight: Promise<PanelSession | null> | null = null;

/**
 * Renova a sessão uma única vez por ciclo. Retornos:
 * - PanelSession regravada (renovação ok, transparente ao operador);
 * - null (refresh token inválido/expirado ⇒ sessão encerrada — FR-007);
 * - lança ApiUnavailableError/ContractViolationError: a sessão é
 *   preservada e o operador vê erro claro no próximo uso (nunca erro de
 *   ação — FR-009).
 */
export async function refreshSession(): Promise<PanelSession | null> {
  const state = await getSession();
  if (!state || state.status === "active") {
    // nada a fazer: sessão vigente (evita refresh desnecessário)
    return state?.session ?? null;
  }
  inFlight ??= doRefresh(state.session.refreshToken).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(refreshToken: string): Promise<PanelSession | null> {
  const response = await refresh(refreshToken);
  if (!response) {
    await clearSession();
    return null;
  }
  return setSession(response);
}