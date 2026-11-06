"use client";

// Confirmação de revogação de acesso (SPE-02 T021, FR-010, Princípio V —
// ação destrutiva NUNCA em um clique): nomeia o funcionário (nome + usuário)
// e o efeito ("a credencial deixa de validar login"). Cancelar NÃO envia
// nada (US4.2). Erros aparecem dentro do diálogo; status permanece até
// confirmação do backend (US4.5/FR-005).

import { Dialog } from "@base-ui/react/dialog";
import Button from "@/shared/components/Button";
import type { EmployeeView } from "@/features/employees/types";

interface ConfirmRevocationDialogProps {
  employee: EmployeeView;
  pending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmRevocationDialog({
  employee,
  pending,
  errorMessage,
  onConfirm,
  onClose,
}: ConfirmRevocationDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-10 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">
            Revogar o acesso de {employee.name}?
          </Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            A credencial de <strong>{employee.username}</strong> deixará de validar login no painel.
            Os dados cadastrais são mantidos e o acesso pode ser reativado depois.
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
              {pending ? "Revogando…" : "Revogar acesso"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
