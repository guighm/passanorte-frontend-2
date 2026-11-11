"use client";

// OsmBaseMap — base ÚNICA de mapas OpenStreetMap do painel (SPE-07 T006,
// research D2 da SPE-07; Constraint 3 da constituição, emenda 2.0.0):
// react-leaflet 5 + leaflet 1.9, gratuito/open source, sem chave de API
// nem billing (RNF15), tiles sem CDN-chave e attribution legal na camada.
// Este `index.tsx` é a BARRA de SSR: importa apenas `next/dynamic` (o
// módulo React do leaflet é carregado via `ssr: false`) — consumidores
// (`SpotMapPicker` SPE-03, `HeatmapCard` SPE-07) importam SOMENTEdaqui.

import dynamic from "next/dynamic";
import type { LeafletBaseMapProps } from "./LeafletBaseMap";

const MAP_SKELETON_CLASSES =
  "flex h-72 w-full flex-col gap-2 rounded-md border border-border p-3";

const LeafletBaseMap = dynamic(() => import("./LeafletBaseMap"), {
  ssr: false,
  loading: () => (
    <div role="status" aria-busy="true" className={MAP_SKELETON_CLASSES}>
      <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
      <span className="sr-only">Carregando mapa…</span>
    </div>
  ),
});

export type OsmBaseMapProps = LeafletBaseMapProps;

export default function OsmBaseMap(props: OsmBaseMapProps) {
  return <LeafletBaseMap {...props} />;
}
