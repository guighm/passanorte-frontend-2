"use client";

// Wrapper client da listagem de funcionários (SPE-02 T014 — plano:
// anfitrião dos diálogos a partir da Server Component page). Recebe a
// listagem já carregada (research D2) e orquestra: cadastro (EmployeeFormDialog
// → OneTimeCredentialDialog — credencial única, FR-008/D5), edição (modo
// edit do mesmo diálogo, FR-009) e revogação/reativação com confirmação
// (FR-010/FR-012). Após cada op confirmada, a page é revalidada pela
// Server Function (FR-005) e o router reflete o estado da API.

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Button from "@/shared/components/Button";
import DataTable, { type DataTableColumnDef } from "@/shared/components/DataTable";
import EmptyState from "@/shared/components/EmptyState";
import { revokeEmployeeAction, reactivateEmployeeAction } from "@/features/employees/actions";
import { describeActionFailure } from "@/features/employees/api/messages";
import EmployeeFormDialog from "@/features/employees/components/EmployeeFormDialog";
import OneTimeCredentialDialog from "@/features/employees/components/OneTimeCredentialDialog";
import ConfirmRevocationDialog from "@/features/employees/components/ConfirmRevocationDialog";
import ConfirmReactivationDialog from "@/features/employees/components/ConfirmReactivationDialog";
import RowActions from "@/features/employees/components/RowActions";
import EmployeeStatusBadge from "@/features/employees/components/EmployeeStatusBadge";
import type { EmployeeView, OneTimeCredential } from "@/features/employees/types";

interface EmployeesViewProps {
  employees: EmployeeView[];
  total: number;
}

type FormState = { mode: "create" } | { mode: "edit"; employee: EmployeeView } | null;
type ConfirmState = { kind: "revoke" | "reactivate"; employee: EmployeeView } | null;

// D7 (clarificação 2026-11-06): ordem alfabética por nome, estável entre
// revalidações — colator pt-BR case-insensitive definido uma única vez.
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

export default function EmployeesView({ employees, total }: EmployeesViewProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(null);
  const [credential, setCredential] = useState<OneTimeCredential | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirmPending, startConfirmTransition] = useTransition();

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
    const { kind, employee } = confirmState;
    startConfirmTransition(async () => {
      const result =
        kind === "revoke"
          ? await revokeEmployeeAction(employee.id)
          : await reactivateEmployeeAction(employee.id);
      if (result.ok) {
        setConfirmState(null);
        setConfirmError(null);
        router.refresh(); // FR-005: reflete o estado retornado pela API
        return;
      }
      setConfirmError(describeActionFailure(result)); // status permanece; diálogo não reabre sozinho (US4.5)
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-title-1">Funcionários</h2>
          <span className="text-body text-foreground-muted">
            {total} no total
          </span>
        </div>
        <Button onClick={() => setFormState({ mode: "create" })}>Novo funcionário</Button>
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
            setCredential(c); // credencial única (FR-008)
          }}
          onUpdated={() => {
            setFormState(null);
            router.refresh();
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
          pending={isConfirmPending}
          errorMessage={confirmError}
          onConfirm={confirmAction}
          onClose={() => setConfirmState(null)}
        />
      ) : null}
      {confirmState?.kind === "reactivate" ? (
        <ConfirmReactivationDialog
          employee={confirmState.employee}
          pending={isConfirmPending}
          errorMessage={confirmError}
          onConfirm={confirmAction}
          onClose={() => setConfirmState(null)}
        />
      ) : null}
    </div>
  );
}
