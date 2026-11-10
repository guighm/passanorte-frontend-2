// Página fina da área de rotas turísticas (SPE-05 T012 — padrão das
// features 03/04): Server Component mínimo renderizando o ToursView
// client — leitura/mutações client-side via TanStack Query + túnel BFF
// (research D1). SUBSTITUI o placeholder da SPE-01. Acesso exclusivo do
// administrador: guardas da SPE-01 em src/proxy.ts cobrem /admin/*
// (FR-001 — sem duplicação). Rotas dedicadas de cadastro/edição
// (clarificação Q1): /admin/tours/new e /admin/tours/[routeId]/edit —
// sem página de detalhe (clarificação da 2ª sessão).

import ToursView from "@/features/tours/components/ToursView";

export default function AdminToursPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ToursView />
    </div>
  );
}

export const metadata = {
  title: "Rotas turísticas — PassaNorte",
};
