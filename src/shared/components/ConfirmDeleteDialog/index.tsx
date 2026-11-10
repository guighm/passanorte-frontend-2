"use client";

// Confirmação de remoção permanente — COMPONENTE TRANSVERSAL (Princípio
// IV, SPE-04 T006 / research D5): elevado de
// `features/attractions/components` (SPE-03 T019) ao shared no segundo
// consumidor real (eventos). Generalizado: o consumidor nomeia o alvo e o
// efeito via `title`/`description` (ReactNode) — nenhuma acoplagem a
// entity types aqui. Ação destrutiva NUNCA em um clique (Princípio V):
// cancelar NÃO envia nada; erro visível dentro do diálogo.

import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import Button from "@/shared/components/Button";

export interface ConfirmDeleteDialogProps {
  /** Nomeia inequivocamente o alvo (ex.: "Remover <item>?", vínculo + data). */
  title: string;
  /** Efeito permanente + o que deixa de existir (aceita conteúdo com ênfase). */
  description: ReactNode;
  pending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
  /** Rótulos pt-BR alternáveis (defaults alinhados aos usos do painel). */
  cancelLabel?: string;
  confirmLabel?: string;
  pendingLabel?: string;
}

export default function ConfirmDeleteDialog({
  title,
  description,
  pending,
  errorMessage,
  onConfirm,
  onClose,
  cancelLabel = "Cancelar",
  confirmLabel = "Remover permanentemente",
  pendingLabel = "Removendo…",
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-10 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">{title}</Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            {description}
          </Dialog.Description>
          {errorMessage ? (
            <div role="alert" className="text-body mt-3 rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
              {errorMessage}
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" disabled={pending} onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button variant="danger" disabled={pending} onClick={onConfirm}>
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
