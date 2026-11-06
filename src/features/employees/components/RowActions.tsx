"use client";

// Ações da listagem por linha (SPE-02 T018/T022): "Editar" sempre; "Revogar"
// para ativo e "Reativar" para revogado (FR-010/FR-012 — as duas ações
// sensíveis abrem DIÁLOGO de confirmação antes de qualquer envio).

import Button from "@/shared/components/Button";
import { employeeStatusIsActive } from "@/features/employees/components/EmployeeStatusBadge";
import type { EmployeeView } from "@/features/employees/types";

export interface RowActionsProps {
  employee: EmployeeView;
  onEdit: (employee: EmployeeView) => void;
  onRevoke: (employee: EmployeeView) => void;
  onReactivate: (employee: EmployeeView) => void;
}

export default function RowActions({ employee, onEdit, onRevoke, onReactivate }: RowActionsProps) {
  const active = employeeStatusIsActive(employee.status);
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" className="h-7 px-2" onClick={() => onEdit(employee)}>
        Editar
      </Button>
      {active ? (
        <Button variant="danger" className="h-7 px-2" onClick={() => onRevoke(employee)}>
          Revogar
        </Button>
      ) : (
        <Button variant="secondary" className="h-7 px-2" onClick={() => onReactivate(employee)}>
          Reativar
        </Button>
      )}
    </div>
  );
}
