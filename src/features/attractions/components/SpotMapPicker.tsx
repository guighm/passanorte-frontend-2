"use client";

// SpotMapPicker — UMA ÚNICA integração de mapa do painel (Constraint 3,
// emenda 2.0.0 da constituição de 2026-11-06, decisão do owner): OpenStreetMap
// via react-leaflet 5 / leaflet 1.9 — zero custo, sem chave de API e sem
// billing (RNF15; o Google exigia pré-pago de R$200 na billing brasileira).
// Interface de props PRESERVADA — SPE-07 (heatmap RF06) reusa este componente.
//
// ⚠️ Leaflet NÃO é avaliável em Node ("window is not defined" no import) —
// por isso o módulo React do Leaflet (`SpotLeafletMap.tsx`) é carregado
// AQUI via `next/dynamic({ ssr: false })`: o servidor nunca importa
// leaflet; até o chunk chegar, o skeleton é anunciável (Princípio V).
// Entrada manual de coordenadas vive no SpotFormDialog (bidirecional via
// props/onChange); centro inicial conforme clarificação (edição = posição
// atual; cadastro = primeiro ponto da listagem; sem dados = global).

import dynamic from "next/dynamic";

const MAP_SKELETON_CLASSES =
  "flex h-72 flex-col gap-2 rounded-md border border-border p-3";
const MAP_SKELETON_BARS = (
  <>
    <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
    <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
    <span className="sr-only">Carregando mapa…</span>
  </>
);

const SpotLeafletMap = dynamic(() => import("./SpotLeafletMap"), {
  ssr: false,
  loading: () => (
    <div role="status" aria-busy="true" className={MAP_SKELETON_CLASSES}>
      {MAP_SKELETON_BARS}
    </div>
  ),
});

export interface SpotMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  /** Centro para CADASTRO (primeiro ponto da listagem vigente ou null). */
  fallbackCenter: { latitude: number; longitude: number } | null;
  onChange: (latitude: number, longitude: number) => void;
}

export default function SpotMapPicker(props: SpotMapPickerProps) {
  return <SpotLeafletMap {...props} />;
}
