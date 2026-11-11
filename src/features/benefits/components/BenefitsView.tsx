"use client";

// BenefitsView (SPE-06 T012 + T015/T016 + T021 — máquina de estados D6, tela
// única do posto): `scanning` (câmera T009 + entrada manual T010 + seletor do
// ponto de retirada com sugestão editável da sessão, FR-010) → `validating`
// → `conference` (T011/T015 — conferência SEM consumir, FR-003) →
// `conceding` → `success` (registro + câmera PAUSADA até "novo atendimento",
// FR-009/clarificação de 2ª sessão) … e `outcome` com mensagem DISTINTA por
// desfecho (FR-006 — nunca colapsada): código inválido (404) · já
// utilizado · rota não concluída (parser rejeita preview não-consumível) ·
// sem estoque (reafirma código válido, FR-007) · ponto não selecionado
// (BLOQUEIO LOCAL — edge case da spec; nada é enviado à API). Falha de
// concessão NÃO consome o código (SC-003). Nova tentativa imediata sem
// recarregar a página (FR-008). A câmera fica ativa APENAS em `scanning`
// (D6). Erros classificados por `messages.ts` (T007); sessão expirada
// durante o fluxo redireciona ao login (T021 — edge case, padrão RouteForm).

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionEndedError } from "@/features/auth/api/errors";
import {
  SESSION_ENDED_PATH,
  failureFromError,
  describeRedemptionValidationFailure,
  describeRedemptionConcessionFailure,
} from "@/features/benefits/api/messages";
import {
  useConfirmRedemptionMutation,
  useValidateCodeMutation,
} from "@/features/benefits/api/queries";
import PickupSpotSelector from "@/features/benefits/components/PickupSpotSelector";
import CodeScanner from "@/features/benefits/components/CodeScanner";
import ManualCodeEntry from "@/features/benefits/components/ManualCodeEntry";
import ConferenceView from "@/features/benefits/components/ConferenceView";
import ConcessionSuccess from "@/features/benefits/components/ConcessionSuccess";
import Button from "@/shared/components/Button";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import type { RedemptionPreviewView, RedemptionView } from "@/features/benefits/types";

type Phase = "scanning" | "validating" | "conference" | "conceding" | "success" | "outcome";

interface OutcomeView {
  message: string;
}

export default function BenefitsView() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [pendingCode, setPendingCode] = useState<RedemptionPreviewView | null>(null);
  const [concession, setConcession] = useState<RedemptionView | null>(null);
  const [outcome, setOutcome] = useState<OutcomeView | null>(null);
  const [cameraReason, setCameraReason] = useState<string | null>(null);
  // Ponto de retirada — seleção POR ATENDIMENTO (clarificação Q3): o valor
  // PERMANECE entre atendimentos da mesma sessão da tela (sugestão do
  // último uso — editável), mas NUNCA é persistido entre sessões
  // (memória do React, FR-010); backToScanning o preserva de propósito.
  const [pickupSpotId, setPickupSpotId] = useState<number | null>(null);
  const [spotLocalError, setSpotLocalError] = useState<string | null>(null);

  const validate = useValidateCodeMutation();
  const concede = useConfirmRedemptionMutation();

  // Sessão expirada durante o fluxo (edge case da spec, T021/FR-012): NÃO é
  // "erro da ação" — redireciona ao login (a renovação/replay única do BFF
  // já falhou antes ⇒ fluxo do FR-007 da SPE-01; mesmo padrão de
  // RouteForm.handleMutationError — Princípio IV reuso, sem duplicação).
  const handleSessionEnded = useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof SessionEndedError)) return false;
      router.replace(SESSION_ENDED_PATH);
      return true;
    },
    [router],
  );

  // Bloqueio LOCAL de seleção vazia (edge case da spec/C1 do analyze): o
  // bloqueio acontece ANTES de qualquer chamada — nunca uma validação SEM
  // ponto de retirada (o mesmo `spotId` vai para validação e concessão).
  const withSpotSelected = useCallback(
    (run: (spotId: number) => void) => {
      if (pickupSpotId === null) {
        setSpotLocalError(
          "Selecione o ponto de retirada desta concessão antes de validar o código.",
        );
        return;
      }
      setSpotLocalError(null);
      run(pickupSpotId);
    },
    [pickupSpotId],
  );

  const startValidation = useCallback(
    (code: string, spotId: number) => {
      setPhase("validating");
      validate.mutate(
        { code, spotId },
        {
          onSuccess: (resolution) => {
            if (resolution.kind === "ready") {
              setPendingCode(resolution.preview);
              setOutcome(null);
              setPhase("conference"); // valida SEM consumir (FR-003)
            } else {
              setOutcome({
                message:
                  resolution.outcome === "incomplete"
                    ? "A rota ainda não foi concluída pelo turista no app — sem brinde disponível para resgate."
                    : "O brinde desta rota está sem estoque — o código permanece válido para retirada após a reposição pelo administrador.",
              });
              setPhase("outcome");
            }
          },
          onError: (error) => {
            if (handleSessionEnded(error)) return; // sessão encerrada (T021)
            const failure = failureFromError(error);
            setOutcome({ message: describeRedemptionValidationFailure(failure) });
            setPhase("outcome");
          },
        },
      );
    },
    [validate, handleSessionEnded],
  );

  const onScanned = useCallback(
    (code: string) => {
      if (validate.isPending || concede.isPending) return; // dedupe em curso
      withSpotSelected((spotId) => startValidation(code, spotId));
    },
    [withSpotSelected, startValidation, validate.isPending, concede.isPending],
  );

  const confirmConcession = useCallback(() => {
    const codePreview = pendingCode;
    if (!codePreview) return;
    // Bloqueio local de seleção vazia na CONFIRMAÇÃO (C1/T015 — edge case;
    // nunca chamar com spotId < 1).
    if (pickupSpotId === null) {
      setOutcome({
        message: "Selecione o ponto de retirada desta concessão antes de confirmar.",
      });
      setPhase("outcome");
      return;
    }
    setPhase("conceding");
    concede.mutate(
      { code: codePreview.code, spotId: pickupSpotId },
      {
        onSuccess: (view) => {
          // Registro retornado pela API — o painel apenas reflete (FR-009).
          setConcession(view);
          setPendingCode(null);
          setPhase("success"); // câmera PAUSADA neste estado (D6/FR-009)
        },
        onError: (error) => {
          if (handleSessionEnded(error)) return; // sessão encerrada (T021)
          const failure = failureFromError(error);
          setOutcome({ message: describeRedemptionConcessionFailure(failure) });
          setPendingCode(null);
          setPhase("outcome"); // falha NÃO consumiu o código (SC-003)
        },
      },
    );
  }, [pendingCode, pickupSpotId, concede, handleSessionEnded]);

  const backToScanning = useCallback(() => {
    setPendingCode(null);
    setConcession(null);
    setOutcome(null);
    setPhase("scanning");
  }, []);

  if (phase === "validating") {
    return (
      <div className="flex flex-col gap-4">
        <LoadingState label="Validando o código de resgate…" />
        <Button variant="secondary" onClick={backToScanning}>
          Cancelar
        </Button>
      </div>
    );
  }

  if (phase === "conceding") {
    return (
      <div className="flex flex-col gap-4">
        <LoadingState label="Registrando a concessão…" />
        <p className="text-caption text-foreground-muted">
          Confirmação em andamento — o código não é reenviado (trava de duplo envio).
        </p>
      </div>
    );
  }

  if (phase === "conference" && pendingCode) {
    return (
      <ConferenceView
        preview={pendingCode}
        pickupSpotId={pickupSpotId}
        onPickupSpotChange={(next) => {
          setPickupSpotId(next); // sugestão da sessão preservada (Q3)
        }}
        conceding={concede.isPending}
        onConfirm={confirmConcession}
        onDiscard={backToScanning}
      />
    );
  }

  if (phase === "success" && concession) {
    return <ConcessionSuccess concession={concession} onNewService={backToScanning} />;
  }

  if (phase === "outcome" && outcome) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState message={outcome.message} />
        {/* Nova tentativa imediata — sem recarregar a página (FR-008). O
            ponto permanece selecionado — mesma sessão de posto. */}
        <Button onClick={backToScanning}>Tentar outro código</Button>
      </div>
    );
  }

  // scanning
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2" aria-label="Ponto de retirada do atendimento">
        <span className="text-caption text-foreground-muted">
          Ponto de retirada (último usado nesta sessão é sugerido; editável)
        </span>
        <PickupSpotSelector
          id="benefits-pickup-spot"
          value={pickupSpotId}
          onChange={(next) => {
            setPickupSpotId(next);
            setSpotLocalError(null);
          }}
          errorMessage={spotLocalError}
        />
      </section>
      <section className="flex flex-col gap-2" aria-label="Leitura por câmera">
        {cameraReason ? (
          <ErrorState
            message={cameraReason}
            detail="Use a entrada manual abaixo — o fluxo de concessão não depende da câmera."
          />
        ) : null}
        <CodeScanner
          active={cameraReason === null}
          onDecoded={onScanned}
          onUnavailable={setCameraReason}
        />
      </section>
      <section className="flex flex-col gap-2" aria-label="Entrada manual">
        <ManualCodeEntry onValidated={onScanned} disabled={validate.isPending || concede.isPending} />
      </section>
    </div>
  );
}
