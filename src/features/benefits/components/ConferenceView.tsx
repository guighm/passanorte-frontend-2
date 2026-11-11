"use client";

// ConferenceView (SPE-06 T011 + T015 — US1/US2): conferência dos dados
// retornados pela VALIDAÇÃO (rota concluída, brinde, disponibilidade) e
// CONFIRMAÇÃO com redigitação do código (clarificação Q2 de 1ª sessão —
// FR-004): o botão "Confirmar concessão" só fica habilitado quando (a) o
// código redigitado bate com o exibido (comparação ignora caixa e espaços
// nas extremidades) e (b) o ponto de retirada está selecionado (BLOQUEIO
// LOCAL de seleção vazia — edge case da spec/C1 do analyze; o bloqueio
// acontece ANTES de qualquer chamada — nunca 404/422 do backend).
// Ponto de retirada é selecionado EM CADA ATENDIMENTO (clarificação Q3 —
// FR-010): o último uso da sessão é SUGESTÃO editável. Descartar volta ao
// leitor sem efeito. Reuso: SpotSelector/spot-name (research D3 — Princípio IV).

import { useMemo, useState } from "react";
import type { RedemptionPreviewView } from "@/features/benefits/types";
import PickupSpotSelector from "@/features/benefits/components/PickupSpotSelector";
import Button from "@/shared/components/Button";

/** Normalização da redigitação (FR-004): iguais se mesmos caracteres após
 * aparar extremidades e ignorando CAIXA. */
function matchesCode(retype: string, expected: string): boolean {
  return retype.trim().toLowerCase() === expected.trim().toLowerCase();
}

interface ConferenceViewProps {
  preview: RedemptionPreviewView;
  /** Ponto selecionado NESTE atendimento (null = não selecionado). */
  pickupSpotId: number | null;
  onPickupSpotChange: (next: number | null) => void;
  /** Concessão em curso — trava duplo envio (Princípio V). */
  conceding: boolean;
  /** Confirmação (US2 — T014 no BenefitsView; spotId já validado localmente). */
  onConfirm: () => void;
  onDiscard: () => void;
}

export default function ConferenceView({
  preview,
  pickupSpotId,
  onPickupSpotChange,
  conceding,
  onConfirm,
  onDiscard,
}: ConferenceViewProps) {
  const [retype, setRetype] = useState("");
  const [spotTouched, setSpotTouched] = useState(false);

  const spotBlocked = pickupSpotId === null;
  const retypeOk = matchesCode(retype, preview.code);
  // Bloqueio LOCAL (C1): conferência + redigitação + ponto selecionado.
  const confirmEnabled = retypeOk && !spotBlocked && !conceding;

  // Aviso de ponto não selecionado — estado de erro local visível (T011/C1).
  const spotError = useMemo(() => {
    if (spotBlocked && spotTouched) {
      return "Selecione o ponto de retirada desta concessão antes de confirmar.";
    }
    return null;
  }, [spotBlocked, spotTouched]);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="conference-title">
      <h2 id="conference-title" className="text-title-2 text-foreground">
        Conferir dados do resgate
      </h2>

      <dl className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-foreground-muted">Código</dt>
          <dd className="text-code text-foreground" aria-live="polite">
            {preview.code}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-foreground-muted">Rota concluída</dt>
          <dd className="text-body text-foreground">
            {preview.route.name}{" "}
            <span className="text-caption text-foreground-muted">(#{preview.route.id})</span>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-foreground-muted">Brinde correspondente</dt>
          <dd className="text-body text-foreground">
            {preview.prize.name} — {preview.prize.stockQuantity} em estoque (
            {preview.prize.available ? "disponível" : "SEM estoque"})
          </dd>
        </div>
      </dl>

      {/* Ponto de retirada — seleção POR ATENDIMENTO (Q3), sugerido editável */}
      <div className="flex flex-col gap-2">
        <span className="text-caption text-foreground-muted">
          Ponto de retirada desta concessão (sugestão: último usado nesta sessão; editável)
        </span>
        <PickupSpotSelector
          id="benefits-pickup-spot"
          value={pickupSpotId}
          onChange={(next) => {
            setSpotTouched(true);
            onPickupSpotChange(next);
          }}
          errorMessage={spotError}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-caption text-foreground-muted" htmlFor="retype-code">
          Redigite o código exibido para habilitar a confirmação
        </label>
        <input
          id="retype-code"
          type="text"
          autoComplete="off"
          disabled={conceding}
          aria-describedby={retypeOk ? undefined : "retype-code-hint"}
          className="text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary disabled:opacity-60"
          placeholder="Digite o código exibido acima"
          value={retype}
          onChange={(event) => {
            setRetype(event.target.value);
          }}
        />
        {!retypeOk ? (
          <p id="retype-code-hint" className="text-caption text-foreground-muted">
            A confirmação liberará quando o código redigitado for igual ao exibido (caixa e
            espaços das extremidades ignorados).
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onConfirm}
          disabled={!confirmEnabled}
          aria-disabled={!confirmEnabled}
        >
          {conceding ? "Concedendo…" : "Confirmar concessão"}
        </Button>
        <Button variant="secondary" onClick={onDiscard} disabled={conceding}>
          Cancelar conferência
        </Button>
      </div>
    </section>
  );
}
