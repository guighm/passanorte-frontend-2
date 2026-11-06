// Renovação coordenada da sessão (US3, FR-006/FR-007): UMA única chamada
// de refresh por ciclo de expiração — requisições simultâneas aguardam o
// mesmo resultado (US3 cenário 4 / SC-003). Falha de renovação encerra a
// sessão (FR-007); NUNCA retrata renovação indefinidamente.
//
// T043 (2026-11-06): o token de renovação confirmado é de USO ÚNICO e é
// ROTACIONADO — `setSession` persiste o novo refreshToken server-side a
// cada renovação, por isso duas renovações seguidas continuam válidas.

import { refresh } from "@/features/auth/api";
import { ContractViolationError } from "@/features/auth/api/errors";
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
  const identity = state.session.operator;
  inFlight ??= doRefresh(state.session.refreshToken, identity).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(
  refreshToken: string,
  identity: { username: string },
): Promise<PanelSession | null> {
  const response = await refresh(refreshToken);
  if (!response) {
    await clearSession();
    return null;
  }
  // Identidade mantém o username da sessão; o papel é o RENOVADO da
  // resposta (T039) e validado/ajustado dentro de setSession — mudança de
  // papel reavalia os guardas (FR-014).
  try {
    return await setSession(response, { username: identity.username });
  } catch (error) {
    // T051 (edge case 1 da spec): papel reconhecido como FORA do enum na
    // renovação é falha de sessão + divergência registrada (Princípio I).
    // Sessão encerrada aqui (sem loop de tentativas); o erro segue
    // explícito ao caller (apiFetch/BFF/PanelShell mapeiam como divergência).
    if (error instanceof ContractViolationError) {
      console.error("[contract-divergence] POST /api/v1/auth/refresh:", error.message);
      await clearSession();
    }
    throw error;
  }
}
