"use client";

// Módulo INTERNO do OsmBaseMap: contém TODAS as importações de
// leaflet/react-leaflet da base de tiles (SPE-07 T006 — extração D2;
// Constraint 3: a integração OSM é definida UMA ÚNICA VEZ aqui e reusada
// pelo SpotMapPicker da SPE-03 e pelo HeatmapCard da SPE-07). **Leaflet
// NÃO é avaliável em Node** ("window is not defined" na importação —
// padrão revelado pela SPE-03): este módulo só pode ser carregado via
// `next/dynamic({ ssr: false })` a partir de `index.tsx` — import
// estático na cadeia client quebra a renderização server-side do segment.

import type { ReactNode } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface LeafletBaseMapProps {
  /** Centro do mapa — SEMPRE calculado a partir de dados da API (Princípio
   * IV: nenhum coordenada padrão de cidade fixada em código). */
  center: { lat: number; lng: number };
  zoom: number;
  scrollWheelZoom?: boolean;
  /** Classes do container externo (default: h-72 — altura do picker). */
  className?: string;
  children?: ReactNode;
}

export default function LeafletBaseMap({
  center,
  zoom,
  scrollWheelZoom = false,
  className,
  children,
}: LeafletBaseMapProps) {
  return (
    <div className={`overflow-hidden rounded-md border border-border ${className ?? "h-72 w-full"}`}>
      <MapContainer
        className="h-full w-full"
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Tiles OpenStreetMap — gratuitos, sem chave; attribution legal obrigatória */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  );
}
