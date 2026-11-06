// Badge de status do acesso (SPE-02 T007, FR-011): ativo vs revogado
// visualmente distintos, com tokens de cor do tema (success/danger soft —
// globals.css). Valor do status: "active" confirmado pelo contrato;
// qualquer outro valor exibe "Revogado" no formato interim (research D8) —
// o probe T005 fixará o valor exato e o parse/badge serão restringidos
// ao enum confirmado no compare de contrato (T025/Princípio I).

import { EMPLOYEE_STATUS_ACTIVE } from "@/features/employees/types";
import { cn } from "@/shared/lib/cn";

const ACTIVE_CLASSES = "bg-success-soft text-success-soft-foreground";
const REVOKED_CLASSES = "bg-danger-soft text-danger-soft-foreground";

export function employeeStatusLabel(status: string): string {
  return status === EMPLOYEE_STATUS_ACTIVE ? "Ativo" : "Revogado";
}

export function employeeStatusIsActive(status: string): boolean {
  return status === EMPLOYEE_STATUS_ACTIVE;
}

export default function EmployeeStatusBadge({ status }: { status: string }) {
  const active = employeeStatusIsActive(status);
  return (
    <span
      className={cn(
        "text-body inline-flex items-center rounded-full px-2 py-0.5 font-medium",
        active ? ACTIVE_CLASSES : REVOKED_CLASSES,
      )}
    >
      {employeeStatusLabel(status)}
    </span>
  );
}
