// Página fina da área de benefícios — concessão de brindes (SPE-06 T013):
// Server Component mínimo renderizando o BenefitsView client. SUBSTITUI o
// placeholder da SPE-01 (US2 T020). A área é a única acessível ao
// funcionário (RF03): guardas da SPE-01 em src/proxy.ts já cobrem
// /benefits (admin + employee) e bloqueiam /admin/* a funcionários —
// sem duplicação de RBAC (FR-001, guardas INALTERADOS).

import BenefitsView from "@/features/benefits/components/BenefitsView";

export default function BeneficiosPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <BenefitsView />
    </div>
  );
}

export const metadata = {
  title: "Benefícios — PassaNorte",
};
