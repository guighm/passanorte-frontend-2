// Página fina da área de pontos turísticos (SPE-03 T009 — padrão SPE-02):
// Server Component mínimo renderizando o AttractionsView client — leitura/
// mutações client-side via TanStack Query + túnel BFF (research D1).
// Acesso exclusivo do administrador: guardas da SPE-01 em src/proxy.ts
// cobrem /admin/* (FR-001, research D9 — sem duplicação).

import AttractionsView from "@/features/attractions/components/AttractionsView";

export default function AdminAttractionsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <AttractionsView />
    </div>
  );
}

export const metadata = {
  title: "Pontos turísticos — PassaNorte",
};
