"use client";

// ConcessionSuccess (SPE-06 T016 — FR-009, clarify de 2ª sessão): registro
// retornado pela API após a concessão (o painel apenas REFLETE — o saldo é
// pós-baixa do backend, Princípio II; nada é calculado no cliente). A tela
// PERMANECE neste registro — com a câmera PAUSADA (D6: a view só liga a
// câmera em `scanning`) — até o funcionário acionar "novo atendimento",
// que limpa o estado e retoma a leitura. `touristId`/`routeId` são
// identificadores opacos (RNF08 — nenhum dado sensível de turista).

import type { RedemptionView } from "@/features/benefits/types";
import Button from "@/shared/components/Button";

interface ConcessionSuccessProps {
  concession: RedemptionView;
  /** "Novo atendimento" — limpa o estado e retoma a leitura (FR-009). */
  onNewService: () => void;
}

export default function ConcessionSuccess({ concession, onNewService }: ConcessionSuccessProps) {
  const usedAt = new Date(concession.usedAt);
  const usedAtLabel = Number.isNaN(usedAt.getTime())
    ? concession.usedAt
    : usedAt.toLocaleString("pt-BR");

  return (
    <section className="flex flex-col gap-4" aria-labelledby="concession-success-title">
      <h2 id="concession-success-title" className="text-title-2 text-foreground">
        Concessão registrada
      </h2>

      <dl className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4" aria-live="polite">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-foreground-muted">Brinde concedido</dt>
          <dd className="text-body font-medium text-foreground">
            {concession.prize.name} — saldo pós-concessão: {concession.prize.stockQuantity}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-foreground-muted">Código consumido</dt>
          <dd className="text-code text-foreground">{concession.code}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-foreground-muted">Ponto de retirada</dt>
          <dd className="text-body text-foreground">#{concession.pickupSpotId}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-foreground-muted">Concedido por</dt>
          <dd className="text-body text-foreground">
            {concession.concededBy} — {usedAtLabel}
          </dd>
        </div>
      </dl>

      <p className="text-caption text-foreground-muted">
        Revalidações deste código retornarão &ldquo;código já utilizado&rdquo; — a invalidação é do
        backend (o painel apenas reflete).
      </p>

      <Button onClick={onNewService}>Novo atendimento</Button>
    </section>
  );
}
