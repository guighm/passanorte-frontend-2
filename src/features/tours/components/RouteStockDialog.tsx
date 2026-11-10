"use client";

// Diálogo de ajuste de estoque do brinde (SPE-05 T015/US4 — RF20): ação na
// LINHA da listagem (clarificação da 2ª sessão — sem página de detalhe).
// Campo numérico inteiro ≥ 0 validado em UI (stockDialogSchema); o
// desfecho exibido é SEMPRE o valor retornado pela API (invalidação —
// FR-004/Princípio II, nenhum cálculo no cliente). Erro 422 do backend
// (guarda de estoque — probe P4) acionável com o VALOR ANTERIOR
// preservado no campo. Botão em progresso trava duplo envio.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import Button from "@/shared/components/Button";
import { SessionEndedError } from "@/features/auth/api/errors";
import { useUpdatePrizeStockMutation } from "@/features/tours/api/queries";
import {
  describePrizeStockFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/tours/api/messages";
import { stockDialogSchema } from "@/features/tours/types/schemas";
import type { RouteSummaryView } from "@/features/tours/types";

const INPUT_CLASSES =
  "text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary";

export default function RouteStockDialog({
  route,
  onClose,
}: {
  route: RouteSummaryView;
  onClose: () => void;
}) {
  const router = useRouter();
  const stockMutation = useUpdatePrizeStockMutation();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleMutationError(mutationError: unknown): boolean {
    if (mutationError instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH);
      return true;
    }
    setError(describePrizeStockFailure(failureFromError(mutationError)));
    return false;
  }

  function submit() {
    setError(null);
    const parsed = stockDialogSchema.safeParse({
      stockQuantity: raw.trim() === "" ? Number.NaN : Number(raw.trim()),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Informe uma quantidade válida.");
      return;
    }
    stockMutation.mutate(
      { prizeId: route.prize.id, body: { stockQuantity: parsed.data.stockQuantity } },
      {
        onSuccess: () => {
          onClose(); // invalidação refletiu o novo saldo (SC-004)
        },
        onError: (mutationError) => {
          // Valor ANTERIOR preservado no campo (cenário 4.3) — só a
          // mensagem de erro muda.
          handleMutationError(mutationError);
        },
      },
    );
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(next: boolean) => {
        if (!next && !stockMutation.isPending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-10 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">Ajustar estoque — {route.prize.name}</Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            Rota <strong>{route.name}</strong>: saldo atual {String(route.prize.stockQuantity)} em
            estoque. A baixa na concessão ao turista é feita automaticamente pelo
            backend — aqui você registra o saldo após reposição ou correção.
          </Dialog.Description>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            noValidate
          >
            {error ? (
              <div role="alert" className="text-body rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
                {error}
              </div>
            ) : null}
            <label className="text-title-4 flex flex-col gap-1" htmlFor="stock-quantity">
              Nova quantidade em estoque
              <input
                id="stock-quantity"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={INPUT_CLASSES}
                value={raw}
                onChange={(event) => {
                  setRaw(event.target.value);
                  setError(null);
                }}
              />
              <span className="text-body text-foreground-muted">Número inteiro, zero ou maior.</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={stockMutation.isPending} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={stockMutation.isPending}>
                {stockMutation.isPending ? "Ajustando…" : "Ajustar estoque"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
