"use client";

// PickupSpotSelector (SPE-06 — P6 do contrato/research D3+): seletor do
// ponto de retirada alimentado pelo CATÁLOGO DO PAPEL
// (`GET /gamification/pickup-spots` — contrato esperado com mock governado,
// D4+). Componente local JUSTIFICADO: o `SpotSelector` de
// `@/features/events` está acoplado ao catálogo administrativo da SPE-03
// (`GET /tourist-spots` — 403 para o funcionário, probe real; P6) e mudar a
// fonte dele quebraria os consumidores existentes. Mantém o tri-estado de
// Princípio V do padrão (carregamento/erro/vazio acionável) e os mesmos
// props essenciais (value/onChange/id/errorMessage) — nada duplicado além
// do necessário.

import { usePickupSpotCatalogQuery } from "@/features/benefits/api/queries";
import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";

interface PickupSpotSelectorProps {
  value: number | null;
  onChange: (next: number | null) => void;
  id?: string;
  errorMessage?: string | null;
}

const SELECT_CLASSES =
  "text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary";

export default function PickupSpotSelector({
  value,
  onChange,
  id,
  errorMessage,
}: PickupSpotSelectorProps) {
  const catalog = usePickupSpotCatalogQuery();

  if (catalog.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando pontos de retirada">
        <select id={id} className={`${SELECT_CLASSES} bg-surface-muted`} disabled>
          <option>Carregando pontos de retirada…</option>
        </select>
      </div>
    );
  }

  if (catalog.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <ErrorState message="Não foi possível carregar os pontos de retirada da API." />
        <Button
          variant="secondary"
          className="h-8 px-2"
          onClick={() => {
            void catalog.refetch();
          }}
        >
          Recarregar
        </Button>
      </div>
    );
  }

  const spots = catalog.data.items;

  if (spots.length === 0) {
    return (
      <p className="text-caption text-foreground-muted">
        Nenhum ponto de retirada configurado — solicite ao administrador.
      </p>
    );
  }

  return (
    <span className="block">
      <select
        id={id}
        className={`${SELECT_CLASSES} ${value === null || errorMessage ? "border-danger" : ""}`}
        aria-invalid={errorMessage ? "true" : undefined}
        aria-describedby={errorMessage ? `${id ?? "pickup-spot"}-error` : undefined}
        value={value === null ? "" : String(value)}
        onChange={(event) => {
          const next = event.target.value === "" ? null : Number(event.target.value);
          onChange(next);
        }}
      >
        <option value="">Selecione o ponto de retirada…</option>
        {spots.map((spot) => (
          <option key={spot.id} value={spot.id}>
            {spot.name}
          </option>
        ))}
      </select>
      {errorMessage ? (
        <span id={`${id ?? "pickup-spot"}-error`} role="alert" className="text-caption mt-1 block text-danger">
          {errorMessage}
        </span>
      ) : null}
    </span>
  );
}
