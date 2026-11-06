"use server"

// Logout (US3, FR-008): encerra a sessão no backend e SEMPRE limpa a sessão
// local; 204/401 ⇒ logout concluído (contrato confirmado 2026-11-06 —
// POST /api/v1/auth/logout). T044: ausência do endpoint (404/405) NÃO é mais
// degradação silenciosa — é divergência explícita do contrato (Princípio I),
// logada para registro nos artefatos; a sessão local ainda é encerrada.
// Um clique, sem confirmação (FR-008 — clarificação 2026-11-06).

import { redirect } from "next/navigation";
import { logout as apiLogout } from "@/features/auth/api";
import { ContractViolationError } from "@/features/auth/api/errors";
import { clearSession, getSession } from "@/features/auth/session";

export async function logoutAction(): Promise<void> {
  const state = await getSession();
  if (state) {
    try {
      await apiLogout(state.session.accessToken);
    } catch (error) {
      if (error instanceof ContractViolationError) {
        console.error("[contract-divergence] POST /api/v1/auth/logout:", error.message);
      } else {
        // indisponibilidade não impede o logout local (US3 / FR-008)
        console.warn("[auth] logout: backend indisponível — sessão local encerrada");
      }
    }
  }
  await clearSession();
  redirect("/login");
}
