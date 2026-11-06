"use client";

// Confirmação de remoção permanente (SPE-03 T019, FR-013, Princípio V —
// ação destrutiva irreversível NUNCA em um clique): NOMEIA o ponto e o
// efeito ("remoção permanente — irreversível", RF12). Cancelar NÃO envia
// nada (US4.2); erro visível dentro do diálogo (US4.3).

import { Dialog } from "@base-ui/react/dialog";
import Button from "@/shared/components/Button";
import type { SpotView } from "@/features/attractions/types";

interface ConfirmDeleteDialogProps {
  spot: SpotView;
  pending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteDialog({
  spot,
  pending,
  errorMessage,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-10 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">Remover {spot.name}?</Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            Esta é uma <strong>remoção permanente e irreversível</strong>: o ponto sai do
            catálogo da cidade, do app do turista e das rotas/dashboard que dependam dele.
          </Dialog.Description>
          {errorMessage ? (
            <div role="alert" className="text-body mt-3 rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
              {errorMessage}
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" disabled={pending} onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={pending} onClick={onConfirm}>
              {pending ? "Removendo…" : "Remover permanentemente"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
