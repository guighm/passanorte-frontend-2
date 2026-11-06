// Shell autenticado do painel (US2 T018 + US3 T025 + US4 T029 + Phase 11
// T050): segunda camada de guarda após src/proxy.ts, navegação condicional
// ao papel (RBAC de superfície, FR-012), cabeçalho com identificação da
// sessão e logout. Transversal a SPE-02..07 (FR-016, Princípio IV).
//
// A leitura de sessão acontece atrás de <Suspense> montado pelo layout
// (guia authentication-with-cache-components, Next 16 com cacheComponents):
// o shell estático prerenderiza e esta parte autenticada (com os children)
// só transmite após o check server-side — conteúdo bloqueado nunca
// streaming (SC-002).
//
// T050 (FR-016 / spec "Contrato da API"): na restauração (recarga de
// página), a identidade/papel são REVALIDADOS server-side via
// `GET /api/v1/auth/me` — o cookie é a primeira camada de render; a
// divergência de identidade/papel vira falha de sessão explícita (edge
// case — nunca acesso por omissão; Princípio I/II).

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ContractViolationError } from "@/features/auth/api/errors";
import { me } from "@/features/auth/api";
import { getSession } from "@/features/auth/session";
import { homePathForRole, NAV_ITEMS, roleCanAccess } from "@/features/auth/guards";
import PanelSidebar from "@/features/auth/components/PanelSidebar";
import PanelHeader from "@/features/auth/components/PanelHeader";

export default async function PanelShell({ children }: { children: ReactNode }) {
  const state = await getSession();
  if (!state) {
    redirect("/login");
  }
  // status "expired": a renovação acontece de forma transparente na
  // primeira chamada à API via Server Function/BFF (US3 cenário 1);
  // sessão sem refresh possível é barrada no getSession.
  let { operator } = state.session;
  let redirectTarget: string | null = null;
  try {
    const identity = await me(state.session.accessToken);
    if (identity && identity.role !== operator.role) {
      // Papel vigente no backend difere da sessão local (ex.: revogação
      // server-side): reavaliação explícita — vai à área do NOVO papel,
      // nunca renderiza conteúdo administrativo do papel antigo (FR-014).
      redirectTarget = homePathForRole(identity.role);
    } else if (identity) {
      operator = identity; // payload confirmado { username, role } (T039)
    }
  } catch (error) {
    if (error instanceof ContractViolationError) {
      console.error("[contract-divergence] GET /api/v1/auth/me:", error.message);
      redirectTarget = "/login"; // fora do enum/formato ⇒ falha de sessão
    }
    // null/indisponibilidade: mantém a identidade do cookie — a reativação
    // (ou encerramento) acontece de forma transparente na próxima chamada
    // de dados via FR-006/FR-007; não derrubar o operador por indisponibilidade.
  }
  // redirect() fora do try — a navegação do Next nunca é engolida por catch.
  if (redirectTarget) {
    redirect(redirectTarget);
  }
  const items = NAV_ITEMS.filter((item) => roleCanAccess(item.href, operator.role));

  return (
    <div className="flex min-h-dvh bg-background">
      <PanelSidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <PanelHeader operator={operator} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
