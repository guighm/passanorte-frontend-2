// PlaceholderSection compartilhada (US2/US4, FR-017/FR-018): placeholder
// estático de seção do painel — NENHUM endpoint de seção é consultado aqui
// (análise E1: SPE-02..07 integrarão os dados reais). Sem dados da cidade
// fixados no código (Princípio IV/RNF06).

interface PlaceholderSectionProps {
  title: string;
  description: string;
  spec: string;
}

export default function PlaceholderSection({
  title,
  description,
  spec,
}: PlaceholderSectionProps) {
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-dashed border-border bg-surface p-6"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="font-mono text-xs text-foreground-muted">{spec}</span>
      </header>
      <p className="mt-2 text-sm text-foreground-muted">
        {description} Esta seção estática fica completa quando a spec{" "}
        <span className="font-mono text-xs">{spec}</span> integrar a API.
      </p>
    </section>
  );
}