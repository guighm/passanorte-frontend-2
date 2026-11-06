// Página fina da área de funcionários (SPE-02 rodada 2, T008 — rewire
// REVISÃO 2/D10): Server Component mínimo que apenas renderiza o
// EmployeesView client — a leitura é client-side via TanStack Query +
// túnel BFF (cache em ["employees"]; estados de loading/vazio/erro no
// próprio view). Acesso exclusivo do administrador: guardas da SPE-01 em
// src/proxy.ts cobrem /admin/* (FR-001, research D9 — sem duplicação).

import EmployeesView from "@/features/employees/components/EmployeesView";

export default function AdminEmployeesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <EmployeesView />
    </div>
  );
}

export const metadata = {
  title: "Funcionários — PassaNorte",
};
