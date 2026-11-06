// Tela de login (US1, RF02) — única rota pública do painel.
// Com sessão ativa não reexibe o formulário: redireciona por papel (T014);
// recebe o aviso de sessão encerrada do fluxo de renovação (T026).
// Leitura de sessão/searchParams atrás de <Suspense> (cacheComponents —
// guia authentication-with-cache-components).

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/session";
import { homePathForRole } from "@/features/auth/guards";
import LoginForm from "@/features/auth/components/LoginForm";

export const metadata = {
  title: "Entrar — PassaNorte",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-[var(--shadow-overlay)]">
        <h1 className="text-title-1 text-foreground">PassaNorte</h1>
        <p className="text-body mt-1 mb-6 text-foreground-muted">
          Painel administrativo — entre com as credenciais geradas pelo sistema.
        </p>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

function LoginFormFallback() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true">
      <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
      <span className="sr-only">Carregando login…</span>
    </div>
  );
}

async function LoginPanel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = await getSession();
  if (state?.status === "active") {
    redirect(homePathForRole(state.session.operator.role));
  }

  const params = await searchParams;
  const sessionEnded = params.reason === "session-expired";
  // FR-011 (T042): destino lembrado pelo guarda — só valor interno;
  // sanitização final acontece no Server Action (clamp ao papel).
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : undefined;

  return (
    <>
      {sessionEnded ? (
        <p
          role="status"
          className="text-body mb-4 rounded-md bg-info-soft px-3 py-2 text-info-soft-foreground"
        >
          Sua sessão foi encerrada. Acesse novamente para continuar.
        </p>
      ) : null}
      <LoginForm next={next} />
    </>
  );
}