// Cabeçalho do painel (US4 T029): identificação da sessão (nome+papel) e
// logout (FR-019 via LogoutButton).

import type { Operator } from "@/features/auth/types";
import LogoutButton from "@/features/auth/components/LogoutButton";

interface PanelHeaderProps {
  operator: Operator;
}

export default function PanelHeader({ operator }: PanelHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
      <span className="text-sm text-foreground-muted">
        <strong className="font-medium text-foreground">{operator.name}</strong>{" "}
        · {operator.role === "funcionario" ? "funcionário" : "administrador"}
      </span>
      <LogoutButton />
    </header>
  );
}