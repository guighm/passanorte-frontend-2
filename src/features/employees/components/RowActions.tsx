"use client";

// Ações da listagem por linha (SPE-02 T018 rodada 1 / T015 rodada 2):
// ícones lucide-react (D11 — complementam o rótulo, nunca o substituem);
// "Editar" sempre; "Revogar" para ativo e "Reativar" para revogado
// (FR-010/FR-012 — as duas ações sensíveis abrem DIÁLOGO de confirmação
// antes de qualquer envio).

import { Pencil, UserCheck, UserX } from "lucide-react";
import Button from "@/shared/components/Button";
import { employeeStatusIsActive } from "@/features/employees/components/EmployeeStatusBadge";
import type { EmployeeView } from "@/features/employees/types";

export interface RowActionsProps {
  employee: EmployeeView;
  onEdit: (employee: EmployeeView) => void;
  onRevoke: (employee: EmployeeView) => void;
  onReactivate: (employee: EmployeeView) => void;
}

const ICON_CLASSES = "h-4 w-4";

export default function RowActions({ employee, onEdit, onRevoke, onReactivate }: RowActionsProps) {
  const active = employeeStatusIsActive(employee.status);
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" className="h-7 px-2" onClick={() => onEdit(employee)}>
        <Pencil className={ICON_CLASSES} aria-hidden="true" />
        Editar
      </Button>
      {active ? (
        <Button variant="danger" className="h-7 px-2" onClick={() => onRevoke(employee)}>
          <UserX className={ICON_CLASSES} aria-hidden="true" />
          Revogar
        </Button>
      ) : (
        <Button variant="secondary" className="h-7 px-2" onClick={() => onReactivate(employee)}>
          <UserCheck className={ICON_CLASSES} aria-hidden="true" />
          Reativar
        </Button>
      )}
    </div>
  );
}
