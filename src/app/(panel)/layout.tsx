// Layout do painel: só o wrapper <Suspense> exigido por cacheComponents
// (Next 16) — a leitura de sessão e a guarda vivem em PanelShell
// (src/features/auth/components), garantindo que o conteúdo bloqueado
// nunca streaming (SC-002). Segunda camada de guarda após src/proxy.ts.

import { Suspense, type ReactNode } from "react";
import PanelShell from "@/features/auth/components/PanelShell";

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