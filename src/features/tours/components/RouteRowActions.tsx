"use client";

// Ações da listagem de rotas por linha (SPE-05 T011 — padrão RowActions
// da SPE-02/03/04): botões SÓ-ÍCONES com lucide-react, rótulo em tooltip
// (Base UI Tooltip — `Tooltip.Portal` obrigatório) + `aria-label`.
// "Editar" navega à página dedicada (clarificação Q1); "Estoque" abre o
// diálogo de ajuste (US4); "Arquivar" abre a confirmação transversal
// (US5/Princípio V — nunca em um clique). Linha ARQUIVADA (probe P1:
// status "archived") NÃO oferece ações (somente-leitura — research D5:
// o backend nega PATCH com 404 e não há reativação; P3 confirmou que o
// estoque de arquivada é aceito pelo backend, mas a UI mantém a linha
// arquivada inativa por decisão de produto registrada).

import { Archive, Package, Pencil } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import Button from "@/shared/components/Button";
import type { RouteSummaryView } from "@/features/tours/types";

/** Valor do `status` de rota arquivada — CONFIRMADO pelo probe P1. */
export const ARCHIVED_ROUTE_STATUS = "archived";

export interface RouteRowActionsProps {
  route: RouteSummaryView;
  onEdit: (route: RouteSummaryView) => void;
  onStock: (route: RouteSummaryView) => void;
  onArchive: (route: RouteSummaryView) => void;
}

const ICON_CLASSES = "h-4 w-4";
const SQUARE_CLASSES = "h-7 w-7 px-0";
const TARGET = "rota"; // rótulo estável para o tooltip quando nome não aplica

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

export default function RouteRowActions({ route, onEdit, onStock, onArchive }: RouteRowActionsProps) {
  if (route.status === ARCHIVED_ROUTE_STATUS) {
    return (
      <span className="text-body text-foreground-muted" aria-label="Rota arquivada — sem ações">
        —
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <IconButtonTooltip
        label={`Editar ${TARGET} ${route.name}`}
        variant="secondary"
        icon={<Pencil className={ICON_CLASSES} aria-hidden="true" />}
        onClick={() => onEdit(route)}
      />
      <IconButtonTooltip
        label={`Ajustar estoque do brinde de ${route.name}`}
        variant="secondary"
        icon={<Package className={ICON_CLASSES} aria-hidden="true" />}
        onClick={() => onStock(route)}
      />
      <IconButtonTooltip
        label={`Arquivar ${TARGET} ${route.name}`}
        variant="danger"
        icon={<Archive className={ICON_CLASSES} aria-hidden="true" />}
        onClick={() => onArchive(route)}
      />
    </div>
  );
}
