// Badge de status de operação (SPE-03 T007, FR-005/US3.4): os 3 estados do
// enum FECHADO do contrato, mapeados explicitamente um a um (globais.css:
// RF15 open → success | temporariamente fechado → warning | fechado
// permanentemente → danger). O parser JÁ lança violação para valor
// desconhecido — o badge nunca vê nada fora do enum (nunca badge genérico).

import {
  SPOT_STATUS_OPEN,
  SPOT_STATUS_PERMANENTLY_CLOSED,
  SPOT_STATUS_TEMPORARILY_CLOSED,
  type SpotStatus,
} from "@/features/attractions/types";
import { cn } from "@/shared/lib/cn";

const STATUS_PRESENTATIONS: Record<SpotStatus, { label: string; classes: string }> = {
  [SPOT_STATUS_OPEN]: {
    label: "Aberto ao público",
    classes: "bg-success-soft text-success-soft-foreground",
  },
  [SPOT_STATUS_TEMPORARILY_CLOSED]: {
    label: "Temporariamente fechado",
    classes: "bg-warning-soft text-warning-soft-foreground",
  },
  [SPOT_STATUS_PERMANENTLY_CLOSED]: {
    label: "Fechado permanentemente",
    classes: "bg-danger-soft text-danger-soft-foreground",
  },
};

export function spotStatusLabel(status: SpotStatus): string {
  return STATUS_PRESENTATIONS[status].label;
}

export default function SpotStatusBadge({ status }: { status: SpotStatus }) {
  const presentation = STATUS_PRESENTATIONS[status];
  return (
    <span
      className={cn(
        "text-body inline-flex items-center rounded-full px-2 py-0.5 font-medium",
        presentation.classes,
      )}
    >
      {presentation.label}
    </span>
  );
}
