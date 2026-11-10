"use client";

// SpotSelector (SPE-04 T012 — FR-006, clarificação 2026-11-10/Q4):
// seletor alimentado EXCLUSIVAMENTE pelo catálogo COMPLETO da SPE-03
// (laço de todas as páginas — useSpotCatalogQuery). Desabilitado enquanto
// o catálogo NÃO está completo — NUNCA habilitado com conjunto parcial.
// Estados de carregamento/erro com nova tentativa (Princípio V). Sem
// pontos fixados no código (RNF06).

import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";
import { useSpotCatalogQuery } from "@/features/events/api/queries";

interface SpotSelectorProps {
  /** Ponto selecionado (valor do formulário — null = sem seleção). */
  value: number | null;
  onChange: (next: number | null) => void;
  /** Id para aria-describedby do campo do formulário (a11y). */
  id?: string;
  /** Mensagem de erro de validação do formulário (após tentativa de envio). */
  errorMessage?: string | null;
}

const SELECT_CLASSES =
  "text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary";

export default function SpotSelector({ value, onChange, id, errorMessage }: SpotSelectorProps) {
  const catalog = useSpotCatalogQuery();

  if (catalog.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {/* aria-busy: seleção NUNCA habilitada com catálogo parcial (FR-006) */}
        <div aria-busy="true" aria-label="Carregando pontos turísticos" className="flex items-center gap-2">
          <select id={id} className={`${SELECT_CLASSES} bg-surface-muted`} disabled>
            <option>Carregando pontos…</option>
          </select>
        </div>
      </div>
    );
  }

  if (catalog.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <ErrorState message="Não foi possível carregar o catálogo de pontos turísticos da API." />
        <Button
          variant="secondary"
          className="h-8 px-2"
          onClick={() => {
            catalog.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (catalog.spots.length === 0) {
    return (
      <p className="text-body text-foreground-muted">
        Não há pontos turísticos cadastrados — cadastre um ponto primeiro
        (todo evento é criado vinculado a um ponto existente).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        id={id}
        className={`${SELECT_CLASSES} ${errorMessage ? "border-danger" : ""}`}
        value={value === null ? "" : String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        aria-invalid={errorMessage ? true : undefined}
      >
        <option value="">Selecione o ponto turístico</option>
        {catalog.spots.map((spot) => (
          <option key={String(spot.id)} value={String(spot.id)}>
            {spot.name}
          </option>
        ))}
      </select>
      {errorMessage ? (
        <span className="text-body text-danger" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
