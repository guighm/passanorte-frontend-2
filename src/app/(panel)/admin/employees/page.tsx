// Listagem real de funcionários (SPE-02 US1, T008 — substitui o placeholder
// da SPE-01 T019): Server Component (research D2) — toda chamada à API passa
// por src/shared/lib/http.ts (Constraint 5). Erros: sessão encerrada ⇒
// login (FR-007); demais ⇒ ErrorState acionável com nova tentativa
// (FR-004/SC-006). Acesso exclusivo do administrador: guardas da SPE-01 em
// src/proxy.ts cobrem /admin/* (FR-001, research D9 — sem duplicação).
// RBAC reforço: papel restrito nunca é decidido aqui — atribuição é do
// backend na criação (FR-002, Princípio II).

import { listEmployees } from "@/features/employees/api";
import EmployeesErrorState from "@/features/employees/components/EmployeesErrorState";
import EmployeesView from "@/features/employees/components/EmployeesView";
import { apiErrorDetail, describeApiError } from "@/features/employees/api/messages";
import type { EmployeeListResponse } from "@/features/employees/types";
import { redirectToLoginIfSessionEnded } from "@/shared/lib/http";

export default async function AdminEmployeesPage() {
  // Busca fora do JSX (react-hooks/error-boundaries): try/catch cobre
  // apenas a chamada à API — nunca a renderização de componentes.
  let list: EmployeeListResponse | null = null;
  let fetchError: unknown = null;
  try {
    list = await listEmployees();
  } catch (error) {
    redirectToLoginIfSessionEnded(error); // redirect() lança quando sessão encerrada (FR-007)
    fetchError = error;
  }

  if (list) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmployeesView employees={list.items} total={list.total} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-title-1">Funcionários</h2>
      <EmployeesErrorState message={describeApiError(fetchError)} detail={apiErrorDetail(fetchError)} />
    </div>
  );
}

export const metadata = {
  title: "Funcionários — PassaNorte",
};
