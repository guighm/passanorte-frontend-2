// LoadingState (US4, T028): estado de carregamento de primeira classe
// (Princípio V) — skeleton pulsante com rótulo anunciável.

interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({ label = "Carregando…" }: LoadingStateProps) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2">
      <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
      <span className="sr-only">{label}</span>
    </div>
  );
}