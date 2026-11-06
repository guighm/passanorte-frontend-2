"use client";

// Diálogo de cadastro/edição de funcionário (SPE-02 T010/T012 — D6, um
// componente para os dois modos; rewire REVISÃO 2/D10): validação RHF +
// Zod espelhando o contrato (name 1–200; username 3–100 — FR-006/FR-007,
// recusa cliente antes do envio) e envio via useMutation (túnel BFF).
// Modo edit envia APENAS os campos alterados (PATCH parcial, FR-009) e
// avisa que alterar o username reemite a credencial de login
// (clarificação 2026-11-06). Estados de carregamento/erro visíveis e
// distintos (Princípio V, FR-014); dados digitados preservados em erro
// (US2.5); sessão encerrada ⇒ login (FR-007).

import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "@/shared/components/Button";
import { SessionEndedError } from "@/features/auth/api/errors";
import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
} from "@/features/employees/api/queries";
import {
  describeActionFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/employees/api/messages";
import { employeeFormSchema, employeeUpdateSchema } from "@/features/employees/types/schemas";
import type { EmployeeView, OneTimeCredential } from "@/features/employees/types";

export interface EmployeeFormDialogProps {
  mode: "create" | "edit";
  employee?: EmployeeView;
  /** Sucesso no modo create: credencial para o diálogo único (T013/FR-008). */
  onCreated: (credential: OneTimeCredential) => void;
  /** Sucesso no modo edit. */
  onUpdated: () => void;
  onClose: () => void;
}

type FormValues = { name: string; username: string };

const INPUT_CLASSES =
  "text-body h-10 rounded-md border border-border bg-surface px-3 text-foreground outline-none focus:border-primary";

export default function EmployeeFormDialog({
  mode,
  employee,
  onCreated,
  onUpdated,
  onClose,
}: EmployeeFormDialogProps) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: employee?.name ?? "",
      username: employee?.username ?? "",
    },
  });
  const usernameValue = watch("username") ?? "";
  const usernameChanged = mode === "edit" && usernameValue.trim() !== (employee?.username ?? "");
  const isPending = mode === "create" ? createMutation.isPending : updateMutation.isPending;

  function onMutationError(error: unknown): boolean {
    if (error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH); // FR-007 — não é "erro da ação"
      return true;
    }
    setFailure(describeActionFailure(failureFromError(error)));
    return false;
  }

  function applyIssues(issues: readonly { path: ReadonlyArray<string | number | symbol>; message: string }[]) {
    for (const issue of issues) {
      const key = issue.path[0];
      if (key === "name" || key === "username") {
        setError(key, { type: "zod", message: issue.message });
        return;
      }
    }
  }

  const submit = handleSubmit((values) => {
    setFailure(null);
    if (mode === "create") {
      const parsed = employeeFormSchema.safeParse(values);
      if (!parsed.success) {
        applyIssues(parsed.error.issues);
        return;
      }
      createMutation
        .mutateAsync({ name: parsed.data.name, username: parsed.data.username })
        .then((created) => {
          // credencial única: flui da resposta 201 para o diálogo (D10/SC-002);
          // a resposta NÃO fica em cache (mutação — Princípio III)
          onCreated({
            employeeId: created.id,
            username: created.username,
            initialPassword: created.initialPassword,
          });
        })
        .catch((error: unknown) => {
          onMutationError(error);
        });
      return;
    }
    // Modo edit: PATCH parcial — apenas campos alterados (FR-009/D6).
    const edited: Partial<FormValues> = {};
    if (values.name.trim() !== (employee?.name ?? "")) {
      edited.name = values.name.trim();
    }
    if (values.username.trim() !== (employee?.username ?? "")) {
      edited.username = values.username.trim();
    }
    if (edited.name === undefined && edited.username === undefined) {
      setFailure("Nenhum campo foi alterado.");
      return;
    }
    const parsed = employeeUpdateSchema.safeParse(edited);
    if (!parsed.success) {
      applyIssues(parsed.error.issues);
      return;
    }
    updateMutation
      .mutateAsync({ id: employee!.id, body: parsed.data })
      .then(() => onUpdated())
      .catch((error: unknown) => {
        onMutationError(error);
      });
  });

  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && !isPending && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/30" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-10 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-title-2">
            {mode === "create" ? "Cadastrar funcionário" : "Editar dados cadastrais"}
          </Dialog.Title>
          <Dialog.Description className="text-body text-foreground-muted">
            {mode === "create"
              ? "A senha de acesso será gerada pelo sistema e exibida uma única vez após o cadastro."
              : "Salve apenas os campos alterados. O status do acesso não é alterado aqui."}
          </Dialog.Description>
          <form noValidate onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <label className="text-title-4 flex flex-col gap-1">
              Nome
              <input
                type="text"
                autoComplete="off"
                aria-invalid={errors.name ? true : undefined}
                className={INPUT_CLASSES}
                {...register("name")}
              />
              {errors.name ? (
                <span role="alert" className="text-body text-danger-soft-foreground">
                  {errors.name.message}
                </span>
              ) : null}
            </label>
            <label className="text-title-4 flex flex-col gap-1">
              Nome de usuário (credencial de login)
              <input
                type="text"
                autoComplete="off"
                aria-invalid={errors.username ? true : undefined}
                className={INPUT_CLASSES}
                {...register("username")}
              />
              {errors.username ? (
                <span role="alert" className="text-body text-danger-soft-foreground">
                  {errors.username.message}
                </span>
              ) : null}
              {usernameChanged ? (
                <span role="note" className="text-body rounded-md bg-warning-soft px-2 py-1 text-warning-soft-foreground">
                  Atenção: alterar o nome de usuário muda a credencial de login — o funcionário passará a autenticar com o novo valor.
                </span>
              ) : null}
            </label>
            {failure ? (
              <div role="alert" className="text-body rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
                {failure}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={isPending} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando…" : mode === "create" ? "Cadastrar" : "Salvar"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
