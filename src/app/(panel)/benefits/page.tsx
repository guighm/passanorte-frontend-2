// /benefits (US2 T020): landing do funcionário — única área acessível a
// funcionário (RF03). A concessão de brindes (scanner, validação e
// confirmação) é definida na SPE-06.

import PlaceholderSection from "@/shared/components/PlaceholderSection";

export default function BeneficiosPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Benefícios</h1>
      <PlaceholderSection
        title="Concessão de brindes"
        description="Leitura do código único de resgate, conferência e confirmação da concessão."
        spec="SPE-06"
      />
    </div>
  );
}

export const metadata = {
  title: "Benefícios — PassaNorte",
};