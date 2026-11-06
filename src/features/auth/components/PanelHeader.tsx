// Cabeçalho do painel (US4 T029): identificação da sessão (username+papel —
// contrato confirmado: sem name/id em nenhuma resposta de identidade,
// T039) e logout (FR-019 via LogoutButton). T040: rótulo por papel.

import type { Operator } from "@/features/auth/types";
import { roleLabel } from "@/features/auth/guards";
import LogoutButton from "@/features/auth/components/LogoutButton";

interface PanelHeaderProps {
  operator: Operator;
}

export default function PanelHeader({ operator }: PanelHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
      <span className="text-body text-foreground-muted">
        <strong className="text-title-4 text-foreground">{operator.username}</strong>{" "}
        · {roleLabel(operator.role)}
      </span>
      <LogoutButton />
    </header>
  );
}
