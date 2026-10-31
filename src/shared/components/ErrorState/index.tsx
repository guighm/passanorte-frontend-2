// ErrorState (US4, T028): estado de erro de primeira classe (Princípio V)
// — mensagem acionável da ação/tela, distinta de loading e vazio.

interface ErrorStateProps {
  message?: string;
  detail?: string;
}

export default function ErrorState({
  message = "Não foi possível concluir a operação.",
  detail,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-1 rounded-md bg-danger-soft px-3 py-3 text-sm text-danger-soft-foreground"
    >
      <span className="font-medium">{message}</span>
      {detail ? <span className="font-mono text-xs opacity-80">{detail}</span> : null}
    </div>
  );
}