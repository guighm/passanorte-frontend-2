"use client";

// Construtor da lista ORDENADA de pontos da rota (SPE-05 T007 — FR-006,
// clarificação Q3/research D3): adicionar pelo seletor do catálogo da
// SPE-03 (reusado de `@/features/events` — research D2), remover e
// REORDENAR por botões subir/descer por item — operáveis por TECLADO e
// ponteiro (FR-016/Constraint 6), SEM arrastar-e-soltar e SEM dependência
// nova. Duplicatas IMPEDIDAS: item já na lista fica desabilitado no
// seletor (residual registrado na 3ª passada de clarify). A posição
// (displayOrder 1..n) é DERIVADA do índice — nunca editável direto
// (sem lacunas). Catálogo parcial NUNCA habilita adição (padrão SPE-04).

import { Minus, MoveDown, MoveUp } from "lucide-react";
import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";
import SpotSelector from "@/features/events/components/SpotSelector";
import type { SpotCatalogState } from "@/features/tours/api/queries";
import { resolveSpotName } from "@/features/events/components/spot-name";

export interface RouteSpotListEntry {
  spotId: number;
}

interface RouteSpotListProps {
  entries: RouteSpotListEntry[];
  onChange: (entries: RouteSpotListEntry[]) => void;
  catalog: SpotCatalogState;
  /** Mensagem de erro de validação do formulário (após tentativa de envio). */
  errorMessage?: string | null;
}

export default function RouteSpotList({
  entries,
  onChange,
  catalog,
  errorMessage,
}: RouteSpotListProps) {
  const selectedIds = entries.map((entry) => entry.spotId);

  function addSpot(spotId: number | null) {
    if (spotId === null || selectedIds.includes(spotId)) return; // duplicata impedida
    onChange([...entries, { spotId }]);
  }

  function removeAt(index: number) {
    if (entries.length <= 1) return; // rota exige ao menos 1 ponto (FR-005)
    onChange([...entries.slice(0, index), ...entries.slice(index + 1)]);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  }

  function spotLabel(spotId: number) {
    return resolveSpotName(catalog, spotId).name;
  }

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-title-4">Pontos da rota (em ordem de visita)</legend>

        {catalog.isPending ? (
          <div aria-busy="true" className="flex items-center gap-2">
            <SpotSelector
              value={null}
              onChange={() => undefined}
              errorMessage={null}
            />
          </div>
        ) : catalog.isError ? (
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
        ) : catalog.spots.length === 0 ? (
          <p className="text-body text-foreground-muted" role="status">
            Não há pontos turísticos cadastrados — cadastre um ponto primeiro
            (toda rota lista pontos turísticos existentes).
          </p>
        ) : (
          <SpotSelector
            value={null}
            onChange={addSpot}
            excludeIds={selectedIds}
            errorMessage={errorMessage ?? null}
          />
        )}

        {/* Lista ordenada — posição derivada do índice (1..n, sem lacunas). */}
        {entries.length > 0 ? (
          <ol className="flex flex-col gap-2" aria-label="Pontos em ordem de visita">
            {entries.map((entry, index) => {
              const isFirst = index === 0;
              const isLast = index === entries.length - 1;
              return (
                <li
                  key={String(entry.spotId)}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
                >
                  <span className="text-title-4 w-6 shrink-0 text-center" aria-hidden="true">
                    {String(index + 1)}
                  </span>
                  <span className="text-body flex-1">{spotLabel(entry.spotId)}</span>
                  <Button
                    variant="secondary"
                    className="h-7 w-7 px-0"
                    aria-label={`Mover ${spotLabel(entry.spotId)} para cima (posição ${String(index + 1)} de ${String(entries.length)})`}
                    disabled={isFirst}
                    onClick={() => move(index, -1)}
                  >
                    <MoveUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-7 w-7 px-0"
                    aria-label={`Mover ${spotLabel(entry.spotId)} para baixo (posição ${String(index + 1)} de ${String(entries.length)})`}
                    disabled={isLast}
                    onClick={() => move(index, 1)}
                  >
                    <MoveDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="danger"
                    className="h-7 w-7 px-0"
                    aria-label={`Remover ${spotLabel(entry.spotId)} da rota`}
                    disabled={entries.length <= 1}
                    onClick={() => removeAt(index)}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ol>
        ) : null}

        <p className="text-body text-foreground-muted" role="status" aria-live="polite">
          {entries.length === 1
            ? "1 ponto na rota — use as setas para reordenar; rota exige ao menos 1 ponto."
            : `${String(entries.length)} pontos na rota — use as setas para reordenar (ordem envia 1..${String(entries.length)}).`}
        </p>
      </fieldset>
    </div>
  );
}
