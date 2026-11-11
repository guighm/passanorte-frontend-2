"use client";

// Mapa de calor das visitas (SPE-07 US1/T008 — RF06, FR-003..006): sobre a
// base OSM ÚNICA (`OsmBaseMap` — Constraint 3, extraída da SPE-03 na T006),
// um `CircleMarker` por marcador da API com raio/cor proporcionais ao peso
// de visitas (clarificação Q3 — SEM camada de calor; regra explicitada no
// T008: raio mínimo 8px, máximo ∝ `weight/maxWeight` da resposta; weight 0
// ou marcador único ⇒ raio mínimo). `spotId: null` ⇒ marcador DE REGIÃO.
// Centro do mapa = média das COORDENADAS DA API (Princípio IV — nenhum
// coordenada de cidade fixada em código; RNF06).
//
// O módulo React do leaflet VIVE num import interno isolado
// (`./HeatmapLeafletMap`) carregado via `next/dynamic({ ssr: false })` —
// leaflet não é avaliável em Node (bug da SPE-03).

import dynamic from "next/dynamic";
import { useState } from "react";
import DashboardCard from "@/features/dashboard/components/DashboardCard";
import { HEATMAP_EMPTY_MESSAGE } from "@/features/dashboard/api/messages";
import { useHeatmapQuery } from "@/features/dashboard/api/queries";
import type { DateWindow } from "@/features/dashboard/types/period";

const HeatmapLeafletMap = dynamic(
  () => import("./HeatmapLeafletMap"),
  { ssr: false },
);

export interface HeatmapCardProps {
  /** Janela global vigente (incluindo startDate ≤ endDate — DashboardView). */
  window: DateWindow;
}

const GROUP_BY_OPTIONS = [
  { value: "spot", label: "Por ponto" },
  { value: "region", label: "Por região" },
] as const;

export default function HeatmapCard({ window }: HeatmapCardProps) {
  const [groupBy, setGroupBy] = useState<"spot" | "region">("spot"); // padrão FR-005
  const query = useHeatmapQuery(groupBy, window);

  const markers = query.data?.markers ?? [];
  const empty = !query.isPending && query.data !== undefined && markers.length === 0;

  return (
    <DashboardCard
      title="Mapa de calor"
      description={
        query.data
          ? "Intensidade proporcional ao peso de visitas do período"
          : undefined
      }
      loading={query.isPending || query.isFetching}
      error={query.error}
      emptyMessage={empty ? HEATMAP_EMPTY_MESSAGE : null}
      refetch={() => {
        void query.refetch();
      }}
    >
      <div className="flex flex-col gap-2">
        <div
          role="group"
          aria-label="Agregação do mapa de calor"
          className="flex w-fit gap-1 rounded-md bg-surface-muted p-1"
        >
          {GROUP_BY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={groupBy === option.value}
              onClick={() => setGroupBy(option.value)}
              className={`cursor-pointer rounded px-3 py-1 text-caption transition-colors ${
                groupBy === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <HeatmapLeafletMap markers={markers} />
      </div>
    </DashboardCard>
  );
}
