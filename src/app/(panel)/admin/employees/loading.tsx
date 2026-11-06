// Carregamento da rota de funcionários (SPE-02 T009, Princípio V/SC-006):
// skeleton distinto durante a viagem server-side da listagem — sem flash
// de "sem dados" antes da resposta (US1 cenário 2).

import LoadingState from "@/shared/components/LoadingState";

export default function AdminEmployeesLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <LoadingState label="Carregando funcionários…" />
    </div>
  );
}
