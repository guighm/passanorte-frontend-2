// Home do painel (US2 T019 + US4 T030): placeholders ESTÁTICOS por seção
// (análise E1 — nenhum endpoint de seção existe no contrato da fundação;
// SPE-02..07 integrarão os dados). Acesso: administrador (guards).
// Nenhum dado da cidade fixado no código (FR-018/Princípio IV).

import PlaceholderSection from "@/shared/components/PlaceholderSection";

const SECTIONS = [
  {
    title: "Dashboard e Insights",
    description: "Mapa de calor, acessos, ranking e distribuições.",
    spec: "SPE-07",
  },
  {
    title: "Pontos Turísticos",
    description: "Cadastro, cronograma, status e categorias.",
    spec: "SPE-03",
  },
  {
    title: "Eventos",
    description: "Eventos vinculados a pontos turísticos.",
    spec: "SPE-04",
  },
  {
    title: "Rotas e Benefícios",
    description: "Rotas turísticas e estoque de brindes.",
    spec: "SPE-05",
  },
  {
    title: "Funcionários",
    description: "Cadastro e revogação de acesso de funcionários.",
    spec: "SPE-02",
  },
] as const;

export default function PanelHomePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="text-title-1 text-foreground">
        Painel administrativo
      </h1>
      <p className="text-body text-foreground-muted">
        As seções do painel chegam nas specs seguintes; os componentes de
        estado (carregamento, vazio e erro) já são transversais em
        <span className="text-body font-mono"> src/shared/components</span>.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <PlaceholderSection
            key={section.spec}
            title={section.title}
            description={section.description}
            spec={section.spec}
          />
        ))}
      </div>
    </div>
  );
}

export const metadata = {
  title: "Início — PassaNorte",
};