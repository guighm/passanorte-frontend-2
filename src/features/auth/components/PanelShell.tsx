// Shell autenticado do painel (US2 T018 + US3 T025 + US4 T029): segunda
// camada de guarda após src/proxy.ts, navegação condicional ao papel
// (RBAC de superfície, FR-012), cabeçalho com identificação da sessão
// (nome+papel) e logout. Transversal a SPE-02..07 (FR-016, Princípio IV).
//
// A leitura de sessão acontece atrás de <Suspense> montado pelo layout
// (guia authentication-with-cache-components, Next 16 com cacheComponents):
// o shell estático prerenderiza e esta parte autenticada (com os children)
// só transmite após o check server-side — conteúdo bloqueado nunca
// streaming (SC-002).

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/session";
import { NAV_ITEMS, roleCanAccess } from "@/features/auth/guards";
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
  const { operator } = state.session;
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