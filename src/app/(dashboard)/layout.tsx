// Shell de layout do painel (US2 T018 + US3 T025 + US4 T029): navegação
// condicional ao papel (RBAC de superfície, FR-012), cabeçalho com
// identificação da sessão (nome+papel) e logout. Transversal a SPE-02..07
// (FR-016, Princípio IV).
//
// Com cacheComponents ativo (Next 16), leitura de sessão só pode acontecer
// atrás de <Suspense> (guia authentication-with-cache-components): o shell
// estático prerenderiza e a parte autenticada (com os children) só
// transmite após o check server-side — conteúdo bloqueado nunca streaming
// (SC-002). Segunda camada de guarda após src/proxy.ts.

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/session";
import { NAV_ITEMS, roleCanAccess } from "@/features/auth/guards";
import LogoutButton from "@/features/auth/components/LogoutButton";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PanelShellFallback />}>
      <PanelShell>{children}</PanelShell>
    </Suspense>
  );
}

function PanelShellFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <p className="text-sm text-foreground-muted" role="status">
        Carregando painel…
      </p>
    </div>
  );
}

async function PanelShell({ children }: { children: ReactNode }) {
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
      <nav aria-label="Navegação do painel" className="flex w-56 flex-col gap-1 border-r border-border bg-surface px-3 py-6">
        <span className="px-2 pb-4 font-mono text-sm font-semibold text-primary">PassaNorte</span>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
          >
            {item.label}
            <span className="font-mono text-[10px] text-foreground-muted">{item.spec}</span>
          </Link>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
          <span className="text-sm text-foreground-muted">
            <strong className="font-medium text-foreground">{operator.name}</strong>{" "}
            · {operator.role === "funcionario" ? "funcionário" : "administrador"}
          </span>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}