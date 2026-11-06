"use client";

// Wrapper client da listagem de funcionários (SPE-02 rodada 2 — T007/T014,
// rewire REVISÃO 2/D10): dados via useEmployeesQuery (cache TanStack Query
// via túnel BFF), mutações de revogação/reativação com confirmação, e
// orquestração dos diálogos (cadastro → credencial única; edição).
// Estados distintos de carregamento/vazio/erro (Princípio V/SC-006);
// revisitas vêm do cache; após cada mutação a lista é invalidada (FR-005).
// Sessão encerrada (401 pós-renovação do túnel) ⇒ retorno ao login (FR-007).

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import Button from "@/shared/components/Button";
import DataTable, { type DataTableColumnDef } from "@/shared/components/DataTable";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { SessionEndedError } from "@/features/auth/api/errors";
import {
  useEmployeesQuery,
  useReactivateEmployeeMutation,
  useRevokeEmployeeMutation,
} from "@/features/employees/api/queries";
import {
  describeActionFailure,
  failureFromError,
  SESSION_ENDED_PATH,
} from "@/features/employees/api/messages";
import EmployeeStatusBadge from "@/features/employees/components/EmployeeStatusBadge";
import EmployeeFormDialog from "@/features/employees/components/EmployeeFormDialog";
import OneTimeCredentialDialog from "@/features/employees/components/OneTimeCredentialDialog";
import ConfirmRevocationDialog from "@/features/employees/components/ConfirmRevocationDialog";
import ConfirmReactivationDialog from "@/features/employees/components/ConfirmReactivationDialog";
import RowActions from "@/features/employees/components/RowActions";
import type { EmployeeView, OneTimeCredential } from "@/features/employees/types";

type FormState = { mode: "create" } | { mode: "edit"; employee: EmployeeView } | null;
type ConfirmState = { kind: "revoke" | "reactivate"; employee: EmployeeView } | null;

// D7 (clarificação 2026-11-06): ordem alfabética por nome, estável entre
// revalidações — collator pt-BR case-insensitive definido uma única vez.
const nameCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

const employeeDateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

/** Datas: formato do payload só será fixado pelo probe (T005) — enquanto
 * ISO parseável, exibimos data curta pt-BR; texto cru caso contrário
 * (nunca inventar formato). */
function formatEmployeeDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return employeeDateFormat.format(parsed);
  return value;
}

export default function EmployeesView() {
  const router = useRouter();
  const employeesQuery = useEmployeesQuery();
  const revokeMutation = useRevokeEmployeeMutation();
  const reactivateMutation = useReactivateEmployeeMutation();

  const [formState, setFormState] = useState<FormState>(null);
  const [credential, setCredential] = useState<OneTimeCredential | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Sessão encerrada na leitura ⇒ retorno ao login (FR-007/D10) — nunca
  // tratado como "erro da tela".
  useEffect(() => {
    if (employeesQuery.error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH);
    }
  }, [employeesQuery.error, router]);

  function handleMutationError(error: unknown): boolean {
    if (error instanceof SessionEndedError) {
      router.replace(SESSION_ENDED_PATH);
      return true;
    }
    return false;
  }

  const columns = useMemo<DataTableColumnDef<EmployeeView>[]>(() => [
    {
      accessorKey: "name",
      header: "Nome",
      sortFn: (rowA, rowB, columnId) =>
        nameCollator.compare(
          String(rowA.getValue(columnId) ?? ""),
          String(rowB.getValue(columnId) ?? ""),
        ), // D7
    },
    { accessorKey: "username", header: "Usuário" },
    {
      id: "status",
      accessorKey: "status",
      header: "Acesso",
      enableSorting: false,
      cell: ({ row }) => <EmployeeStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      enableSorting: false,
      cell: ({ row }) => formatEmployeeDate(row.original.createdAt),
    },
    {
      accessorKey: "updatedAt",
      header: "Atualizado em",
      enableSorting: false,
      cell: ({ row }) => formatEmployeeDate(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "Ações",
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          employee={row.original}
          onEdit={(employee) => setFormState({ mode: "edit", employee })}
          onRevoke={(employee) => {
            setConfirmError(null);
            setConfirmState({ kind: "revoke", employee });
          }}
          onReactivate={(employee) => {
            setConfirmError(null);
            setConfirmState({ kind: "reactivate", employee });
          }}
        />
      ),
    },
  ], []);

  function confirmAction() {
    if (!confirmState) return;
    setConfirmError(null);
    const { kind, employee } = confirmState;
    const mutation = kind === "revoke" ? revokeMutation : reactivateMutation;
    mutation.mutate(employee.id, {
      onSuccess: () => {
        setConfirmState(null); // invalidação (queries.ts) reflete o estado da API (FR-005)
      },
      onError: (error) => {
        // status permanece; diálogo não reabre sozinho (US4.5)
        if (handleMutationError(error)) return;
        setConfirmError(describeActionFailure(failureFromError(error)));
      },
    });
  }

  const confirmPending =
    confirmState?.kind === "revoke" ? revokeMutation.isPending : reactivateMutation.isPending;

  // -------------------------------------------------- estados da consulta --
  if (employeesQuery.isPending) {
    return (
      <div className="mx-auto max-w-4xl">
        <LoadingState label="Carregando funcionários…" />
      </div>
    );
  }
  if (employeesQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-start gap-3">
          <ErrorState message={describeActionFailure(failureFromError(employeesQuery.error))} />
          <Button
            variant="secondary"
            onClick={() => {
              void employeesQuery.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const employees = employeesQuery.data.items;
  const total = employeesQuery.data.total;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-title-1">Funcionários</h2>
          <span className="text-body text-foreground-muted">{total} no total</span>
        </div>
        <Button onClick={() => setFormState({ mode: "create" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo funcionário
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <EmptyState message="Nenhum funcionário cadastrado ainda." />
          <Button variant="secondary" onClick={() => setFormState({ mode: "create" })}>
            Cadastrar primeiro funcionário
          </Button>
        </div>
      ) : (
        <DataTable
          data={employees}
          columns={columns}
          initialSorting={[{ id: "name", desc: false }]} // D7/FR-003/SC-005
          getRowKey={(employee) => String(employee.id)}
        />
      )}

      {formState ? (
        <EmployeeFormDialog
          key={formState.mode === "edit" ? `edit-${formState.employee.id}` : "create"}
          mode={formState.mode}
          employee={formState.mode === "edit" ? formState.employee : undefined}
          onCreated={(c) => {
            setFormState(null);
            setCredential(c); // credencial única (FR-008); mutação já invalidou a lista
          }}
          onUpdated={() => {
            setFormState(null); // invalidação já reflete na listagem
          }}
          onClose={() => setFormState(null)}
        />
      ) : null}

      {credential ? (
        <OneTimeCredentialDialog
          credential={credential}
          onClose={() => setCredential(null)} // o valor é descartado com o componente (SC-002/D5)
        />
      ) : null}

      {confirmState?.kind === "revoke" ? (
        <ConfirmRevocationDialog
          employee={confirmState.employee}
          pending={confirmPending}
          errorMessage={confirmError}
          onConfirm={confirmAction}
          onClose={() => setConfirmState(null)}
        />
      ) : null}
      {confirmState?.kind === "reactivate" ? (
        <ConfirmReactivationDialog
          employee={confirmState.employee}
          pending={confirmPending}
          errorMessage={confirmError}
          onConfirm={confirmAction}
          onClose={() => setConfirmState(null)}
        />
      ) : null}
    </div>
  );
}
