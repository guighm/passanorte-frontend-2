// EmptyState (US4, T028): estado vazio de primeira classe (Princípio V) —
// mensagem neutra e acionável quando a API não devolve registros.

interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message = "Nenhum registro por aqui." }: EmptyStateProps) {
  return (
    <p role="status" className="rounded-md bg-surface-muted px-3 py-4 text-sm text-foreground-muted">
      {message}
    </p>
  );
}