"use server"

// Logout (US3, FR-008): encerra a sessão no backend quando possível e
// SEMPRE limpa a sessão local; 401 ⇒ logout concluído; endpoint não
// existente (404/405) ⇒ logout local + anotação de divergência (F2).

import { redirect } from "next/navigation";
import { logout as apiLogout } from "@/features/auth/api";
import { clearSession, getSession } from "@/features/auth/session";

export async function logoutAction(): Promise<void> {
  const state = await getSession();
  if (state) {
    try {
      const result = await apiLogout(state.session.accessToken);
      if (result.contractDivergence) {
        console.warn("[contract-divergence] /auth/logout:", result.contractDivergence);
      }
    } catch {
      // indisponibilidade não impede o logout local (US3 / FR-008)
    }
  }
  await clearSession();
  redirect("/login");
}