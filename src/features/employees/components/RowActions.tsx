"use client";

// Ações da listagem por linha (SPE-02 T018 rodada 1 / T015 rodada 2):
// botões SÓ-ÍCONES com lucide-react (D11) e rótulo em tooltip (Base UI
// Tooltip) + `aria-label` (FR-016/acessibilidade — o ícone NUNCA fica
// sem identificação para teclado/leitor de tela). "Editar" sempre;
// "Revogar" para ativo e "Reativar" para revogado (FR-010/FR-012 — as
// duas ações sensíveis abrem DIÁLOGO de confirmação antes de qualquer envio).

import { Pencil, UserCheck, UserX } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
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
const SQUARE_CLASSES = "h-7 w-7 px-0";

/** Botão só-ícone com tooltip + aria-label (texto vive no tooltip — FR-016). */
function IconButtonTooltip({
  label,
  onClick,
  variant,
  icon,
}: {
  label: string;
  onClick: () => void;
  variant: "secondary" | "danger";
  icon: React.ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Button
            variant={variant}
            className={SQUARE_CLASSES}
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {icon}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={4}>
          <Tooltip.Popup className="text-body rounded-md bg-foreground px-2 py-1 text-background shadow-sm">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export default function RowActions({ employee, onEdit, onRevoke, onReactivate }: RowActionsProps) {
  const active = employeeStatusIsActive(employee.status);
  return (
    <div className="flex items-center gap-2">
      <IconButtonTooltip
        label={`Editar ${employee.name}`}
        variant="secondary"
        icon={<Pencil className={ICON_CLASSES} aria-hidden="true" />}
        onClick={() => onEdit(employee)}
      />
      {active ? (
        <IconButtonTooltip
          label={`Revogar acesso de ${employee.name}`}
          variant="danger"
          icon={<UserX className={ICON_CLASSES} aria-hidden="true" />}
          onClick={() => onRevoke(employee)}
        />
      ) : (
        <IconButtonTooltip
          label={`Reativar acesso de ${employee.name}`}
          variant="secondary"
          icon={<UserCheck className={ICON_CLASSES} aria-hidden="true" />}
          onClick={() => onReactivate(employee)}
        />
      )}
    </div>
  );
}
