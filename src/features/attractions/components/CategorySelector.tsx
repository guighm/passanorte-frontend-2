"use client";

// CategorySelector (SPE-03 T011, FR-010): checkboxes alimentados
// EXCLUSIVAMENTE pelo catálogo da API (fonte decidida: interesses do
// turista — clarificação 2026-11-06; correspondência de chaves validada
// pelo probe T004). Rótulo pt do catálogo com fallback honesto ao key —
// NUNCA categorias hard-coded (RNF06/SC-005). Estados próprios de
// carregamento/erro com nova tentativa (Princípio V).

import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { useSpotCategoriesQuery } from "@/features/attractions/api/queries";

interface CategorySelectorProps {
  /** Chaves selecionadas (valor do formulário). */
  value: string[];
  onChange: (next: string[]) => void;
  /** Id para aria-describedby do campo do formulário (a11y). */
  id?: string;
}

export default function CategorySelector({ value, onChange, id }: CategorySelectorProps) {
  const categories = useSpotCategoriesQuery();

  function toggle(key: string, checked: boolean) {
    if (checked) {
      if (!value.includes(key)) onChange([...value, key]);
      return;
    }
    onChange(value.filter((current) => current !== key));
  }

  return (
    <fieldset id={id} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <legend className="text-title-4 px-1">Categorias</legend>
      {categories.isPending ? (
        <LoadingState label="Carregando categorias…" />
      ) : categories.isError ? (
        <div className="flex flex-col items-start gap-2">
          <ErrorState message="Não foi possível carregar o catálogo de categorias da API." />
          <Button
            variant="secondary"
            className="h-8 px-2"
            onClick={() => {
              void categories.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : categories.data.length === 0 ? (
        <p className="text-body text-foreground-muted">
          O catálogo da API não retornou categorias — impossível escolher (nenhum valor é inventado no painel).
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.data.map((category) => (
            <label key={category.key} className="text-body flex items-center gap-2 rounded-md border border-border px-2 py-1">
              <input
                type="checkbox"
                checked={value.includes(category.key)}
                onChange={(event) => toggle(category.key, event.target.checked)}
              />
              {category.label ?? category.key}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
