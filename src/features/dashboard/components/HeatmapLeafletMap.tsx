"use client";

// Módulo INTERNO do HeatmapCard (SPE-07 T008): TODAS as importações de
// leaflet/react-leaflet desta card — NUNCA importado estaticamente fora
// da cadeia `next/dynamic({ ssr: false })` (leaflet não é avaliável em
// Node — padrão revelado pela SPE-03). A BASE de tiles NÃO vive aqui:
// consumo do `LeafletBaseMap` compartilhado (Constraint 3 — integração
// definida uma única vez em src/shared/components/OsmBaseMap, research
// D2). Marcação visual: `CircleMarker` com raio/cor proporcionais a
// `weight` (Q3 — sem camada de calor); regra de scale da T008
// (raio mínimo 8px, extra ∝ weight/maxWeight; weight 0 ⇒ mínimo).

import { useEffect, useMemo } from "react";
import { CircleMarker, Tooltip, useMap } from "react-leaflet";
import LeafletBaseMap from "@/shared/components/OsmBaseMap/LeafletBaseMap";
import type { HeatmapMarker } from "@/features/dashboard/types";

const BASE_RADIUS_PX = 8; // raio mínimo (weight 0 / marcador único)
const MAX_EXTRA_RADIUS_PX = 22; // raio máximo extra (raio máximo 30px)

/** Rampa de cor fixa da UI (não é dado de cidade — RNF06/Princípio IV). */
const RAMP_LOW = { r: 0xfd, g: 0xe6, b: 0x8a };
const RAMP_HIGH = { r: 0xb9, g: 0x1c, b: 0x1c };

function rampColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * clamped);
  const r = channel(RAMP_LOW.r, RAMP_HIGH.r);
  const g = channel(RAMP_LOW.g, RAMP_HIGH.g);
  const b = channel(RAMP_LOW.b, RAMP_HIGH.b);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Reposiciona o mapa (setView) quando a janela/agregação muda — o
 * MapContainer da react-leaflet não reage ao prop `center` pós-montagem. */
function Recenter({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

export interface HeatmapLeafletMapProps {
  /** Ordem da API preservada (contract rule 2 — nunca reordenar). */
  markers: HeatmapMarker[];
}

export default function HeatmapLeafletMap({ markers }: HeatmapLeafletMapProps) {
  const metrics = useMemo(() => {
    if (markers.length === 0) return null; // vazio é estado do card (T008)
    return {
      maxWeight: markers.reduce((max, marker) => Math.max(max, marker.weight), 0),
      center: markers.reduce(
        (acc, marker) => ({
          lat: acc.lat + marker.latitude / markers.length,
          lng: acc.lng + marker.longitude / markers.length,
        }),
        { lat: 0, lng: 0 },
      ),
      zoom: markers.length > 1 ? 11 : 13,
    };
  }, [markers]);

  if (!metrics) return null;

  return (
    <div className="flex flex-col">
      <LeafletBaseMap center={metrics.center} zoom={metrics.zoom} className="h-96 w-full">
        <Recenter center={metrics.center} zoom={metrics.zoom} />
        {markers.map((marker, index) => {
          const t = metrics.maxWeight > 0 ? marker.weight / metrics.maxWeight : 0;
          const radius = BASE_RADIUS_PX + Math.round(MAX_EXTRA_RADIUS_PX * t);
          const color = rampColor(t);
          return (
            <CircleMarker
              key={marker.spotId === null ? `region:${index}` : `spot:${marker.spotId}`}
              center={[marker.latitude, marker.longitude]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 1 }}
            >
              <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
                <span className="text-body">
                  {marker.name} — {marker.weight} visitas
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </LeafletBaseMap>
      {/* Alternativa acessível do mapa (FR-018/Constraint 6): lista completa
          dos marcadores, na ordem enviada pela API — o tooltip do mapa
          depende de ponteiro; nome/peso de CADA marcador fica legível por
          leitor de tela/navegação por teclado. */}
      <ul className="sr-only">
        {markers.map((marker, index) => (
          <li key={marker.spotId === null ? `region:${index}` : `spot:${marker.spotId}`}>
            {marker.name} — {marker.weight} visitas
          </li>
        ))}
      </ul>
    </div>
  );
}
