"use client";

// Ações da listagem por linha (SPE-03 T017/T019 — padrão RowActions da
// SPE-02): botões SÓ-ÍCONES com lucide-react (D11), rótulo em tooltip
// (Base UI Tooltip — `Tooltip.Portal` obrigatório) + `aria-label`
// (FR-016). "Editar" sempre; "Remover" abre DIÁLOGO de confirmação
// (remoção permanente — FR-013, nunca em um clique).

import { Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import Button from "@/shared/components/Button";
import type { SpotView } from "@/features/attractions/types";

export interface RowActionsProps {
  spot: SpotView;
  onEdit: (spot: SpotView) => void;
  onDelete: (spot: SpotView) => void;
}

const ICON_CLASSES = "h-4 w-4";
const SQUARE_CLASSES = "h-7 w-7 px-0";

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
          <Button variant={variant} className={SQUARE_CLASSES} aria-label={label} onClick={onClick} />
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

export default function RowActions({ spot, onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <IconButtonTooltip
        label={`Editar ${spot.name}`}
        variant="secondary"
        icon={<Pencil className={ICON_CLASSES} aria-hidden="true" />}
        onClick={() => onEdit(spot)}
      />
      <IconButtonTooltip
        label={`Remover ${spot.name}`}
        variant="danger"
        icon={<Trash2 className={ICON_CLASSES} aria-hidden="true" />}
        onClick={() => onDelete(spot)}
      />
    </div>
  );
}
