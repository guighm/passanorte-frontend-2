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
      className="text-body flex flex-col gap-1 rounded-md bg-danger-soft px-3 py-3 text-danger-soft-foreground"
    >
      <span className="text-title-4">{message}</span>
      {detail ? <span className="text-code opacity-80">{detail}</span> : null}
    </div>
  );
}