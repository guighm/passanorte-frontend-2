"use client";

// Exibição ÚNICA da credencial gerada pelo backend (SPE-02 T013, FR-008,
// research D5 — caso citado no Princípio V da constituição): username +
// senha inicial com ação de copiar e aviso claro de não-reexibição. Ao
// fechar, o valor É DESCARTADO junto com o componente (estado local apenas
// — nunca reexibida em listagem/edição/histórico nem persistida: SC-002,
// Princípio III). O caller descarta a referência ao fechar.

import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import Button from "@/shared/components/Button";
import type { OneTimeCredential } from "@/features/employees/types";

interface OneTimeCredentialDialogProps {
  credential: OneTimeCredential;
  onClose: () => void;
}

export default function OneTimeCredentialDialog({ credential, onClose }: OneTimeCredentialDialogProps) {
  const [copied, setCopied] = useState(false);

  const lines = `Usuário: ${credential.username}\nSenha: ${credential.initialPassword}`;

  async function copyCredential() {
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-10 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">Funcionário cadastrado</Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            Guarde a credencial de acesso gerada pelo sistema e repasse-a ao funcionário.
          </Dialog.Description>
          <div className="mt-4 flex flex-col gap-2 rounded-md bg-surface-muted px-3 py-3">
            <span className="text-body">
              Usuário: <code className="text-code">{credential.username}</code>
            </span>
            <span className="text-body">
              Senha: <code className="text-code">{credential.initialPassword}</code>
            </span>
          </div>
          <p role="alert" className="text-body mt-3 rounded-md bg-warning-soft px-3 py-2 text-warning-soft-foreground">
            Esta senha NÃO será exibida novamente. Copie-a e entregue ao funcionário agora — não há reexibição nem recuperação pelo painel.
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => void copyCredential()}>
              {copied ? "Copiado!" : "Copiar credencial"}
            </Button>
            <Button onClick={onClose}>Concluí</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
