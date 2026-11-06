"use client"

// LoginForm (US1, FR-001/FR-003/FR-019): <form> + useActionState (padrão do
// guia authentication.md — research D4). Estados de UI distintos e
// acessíveis: pending, erro (role="alert"), labels ligados aos campos. O
// painel valida apenas campos vazios; credenciais competem à API
// (Princípio II). T042: carrega o destino lembrado (`next`) como campo
// oculto — o Server Action devolve ao destino clampado ao papel (FR-011).

import { useActionState } from "react";
import Button from "@/shared/components/Button";
import { loginAction, type LoginState } from "@/features/auth/actions/login";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {/* FR-011 (T042): destino lembrado pelo guarda; clampado no action. */}
      <input type="hidden" name="next" value={next ?? ""} readOnly />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-title-4 text-foreground">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          disabled={pending}
          className="text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-60"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-title-4 text-foreground">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-60"
        />
      </div>

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>

      {state.error ? (
        <p
          role="alert"
          className="text-body rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
