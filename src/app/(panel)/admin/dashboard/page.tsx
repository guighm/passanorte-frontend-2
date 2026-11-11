// Página do Dashboard e Insights (SPE-07 T007 — padrão de tela fina das
// SPE-02..06): Server Component mínimo renderizando o DashboardView client
// (dados client-side via TanStack Query + túnel BFF — Constraint 5).
// Acesso exclusivo do administrador: guardas da SPE-01 em src/proxy.ts
// cobrem /admin/* (FR-001, sem duplicação).

import DashboardView from "@/features/dashboard/components/DashboardView";

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <DashboardView />
    </div>
  );
}

export const metadata = {
  title: "Dashboard — PassaNorte",
};
