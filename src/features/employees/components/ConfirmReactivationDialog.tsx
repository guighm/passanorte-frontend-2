"use client";

// Confirmação de reativação de acesso (SPE-02 T021, FR-012 — ação sensível
// à segurança, decidida na clarificação 2026-11-06): nomeia o funcionário
// (nome + usuário) e o efeito ("o acesso volta a validar login").
// Cancelar NÃO envia nada; erros aparecem dentro do diálogo.

import { Dialog } from "@base-ui/react/dialog";
import Button from "@/shared/components/Button";
import type { EmployeeView } from "@/features/employees/types";

interface ConfirmReactivationDialogProps {
  employee: EmployeeView;
  pending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmReactivationDialog({
  employee,
  pending,
  errorMessage,
  onConfirm,
  onClose,
}: ConfirmReactivationDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-10 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">
            Reativar o acesso de {employee.name}?
          </Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            A credencial de <strong>{employee.username}</strong> voltará a validar login no painel (status ativo).
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
            <Button disabled={pending} onClick={onConfirm}>
              {pending ? "Reativando…" : "Reativar acesso"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
