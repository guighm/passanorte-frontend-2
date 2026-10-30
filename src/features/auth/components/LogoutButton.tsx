"use client"

// LogoutButton (US3, FR-019): <form> acionando a Server Action de logout —
// funciona sem JS e operável por teclado; pending visível via useFormStatus.

import { useFormStatus } from "react-dom";
import { logoutAction } from "@/features/auth/actions/logout";

function PendingButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <PendingButton />
    </form>
  );
}