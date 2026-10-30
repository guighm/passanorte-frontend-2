"use client"

// LoginForm (US1, FR-001/FR-003/FR-019): <form> + Server Action +
// useActionState (padrão do guia authentication.md — research D4).
// Estados de UI distintos e acessíveis: pending, erro (role="alert"),
// labels ligados aos campos. O painel valida apenas campos vazios;
// credenciais competem à API (princípio II).

import { useActionState } from "react";
import Button from "@/shared/components/Button";
import { loginAction, type LoginState } from "@/features/auth/actions/login";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-foreground">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          disabled={pending}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground disabled:opacity-60"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground disabled:opacity-60"
        />
      </div>

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}