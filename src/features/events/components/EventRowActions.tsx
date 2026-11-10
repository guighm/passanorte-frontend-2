"use client";

// Ações da listagem de eventos por linha (SPE-04 T009 — padrão RowActions
// da SPE-02/SPE-03): botões SÓ-ÍCONES com lucide-react, rótulo em tooltip
// (Base UI Tooltip — `Tooltip.Portal` obrigatório) + `aria-label`.
// "Editar" navega à página dedicada (FR-013 — research D3, não diálogo);
// "Remover" abre DIÁLOGO de confirmação transversal (Princípio V — nunca
// em um clique; diálogo conectado em T020/US4).

import { Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import Button from "@/shared/components/Button";
import type { EventView } from "@/features/events/types";

export interface EventRowActionsProps {
  event: EventView;
  /** Nome resolvido do vínculo (fallback incluído — FR-012). */
  spotName: string;
  onEdit: (event: EventView) => void;
  onDelete: (event: EventView) => void;
}

const ICON_CLASSES = "h-4 w-4";
const SQUARE_CLASSES = "h-7 w-7 px-0";
const TARGET = "evento"; // rótulo estável para o tooltip quando nome não aplica

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

export default function EventRowActions({ event, spotName, onEdit, onDelete }: EventRowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <IconButtonTooltip
        label={`Editar ${TARGET} em ${spotName}`}
        variant="secondary"
        icon={<Pencil className={ICON_CLASSES} aria-hidden="true" />}
        onClick={() => onEdit(event)}
      />
      <IconButtonTooltip
        label={`Remover ${TARGET} em ${spotName}`}
        variant="danger"
        icon={<Trash2 className={ICON_CLASSES} aria-hidden="true" />}
        onClick={() => onDelete(event)}
      />
    </div>
  );
}
