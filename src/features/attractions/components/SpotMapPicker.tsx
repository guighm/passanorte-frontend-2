"use client";

// SpotMapPicker — UMA ÚNICA integração de mapa do painel (Constraint 3,
// emenda 2.0.0 da constituição de 2026-11-06, decisão do owner): migrada de
// Google Maps para **OpenStreetMap via react-leaflet 5 / leaflet 1.9** —
// zero custo, sem chave de API e sem billing (RNF15; o Google exigia
// pré-pago de R$200 na billing brasileira). Interface de props PRESERVADA —
// SPE-07 (heatmap RF06) reusa este componente.
// Clique no mapa define a posição; digitar as coordenadas no formulário
// posiciona o marcador (bidirecional — SC-004, FR-009). Centro inicial
// (clarificação): posição informada em edição; em cadastro, primeiro ponto
// da listagem (`fallbackCenter`) — sem dados, visão padrão global (NADA
// fixado no código, RNF06). Sem SSR: leaflet exige `window` — o mapa
// renderiza após mount com skeleton anunciável (Princípio V).

import { useMemo, useSyncExternalStore } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

export interface SpotMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  /** Centro para CADASTRO (primeiro ponto da listagem vigente ou null). */
  fallbackCenter: { latitude: number; longitude: number } | null;
  onChange: (latitude: number, longitude: number) => void;
}

let markerIcon: L.Icon | null = null;

function spotMarkerIcon(): L.Icon {
  // Ícones servidos pelo próprio bundle via import (sem CDN — Princípio III);
  // resolve o clássico "default marker icon asset" quebrado em bundlers.
  if (!markerIcon) {
    markerIcon = L.icon({
      iconUrl: String(markerIconPng),
      iconRetinaUrl: String(markerIcon2xPng),
      shadowUrl: String(markerShadowPng),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }
  return markerIcon;
}

/** "Subscrição" vazia — o useSyncExternalStore só diferencia
 * server/client snapshot (detecção de hidratação, sem fonte externa). */
const subscribeNoop = () => () => {};

/** Captura cliques no mapa (react-leaflet: handlers via useMapEvents). */
function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function SpotMapPicker({
  latitude,
  longitude,
  fallbackCenter,
  onChange,
}: SpotMapPickerProps) {
  // Leaflet usa `window` em init — renderiza só pós-hidratação, com o
  // padrão canônico `useSyncExternalStore` (server snapshot = false ⇒
  // skeleton anunciável no SSR; re-render pós-hidratação sem mismatch —
  // Princípio V; o lint react-hooks rejeita setState-em-effect aqui).
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const center = useMemo(() => {
    if (latitude !== null && longitude !== null) return { lat: latitude, lng: longitude };
    if (fallbackCenter) return { lat: fallbackCenter.latitude, lng: fallbackCenter.longitude };
    // Sem centro conhecido (catálogo vazio): visão padrão GLOBAL {0,0} —
    // default da biblioteca, NÃO é dado de cidade (RNF06).
    return { lat: 0, lng: 0 };
  }, [latitude, longitude, fallbackCenter]);

  const zoom = latitude !== null && longitude !== null ? 15 : fallbackCenter ? 13 : 1;

  const position =
    latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : undefined;

  if (!mounted) {
    return (
      <div role="status" aria-busy="true" className="flex h-72 flex-col gap-2 rounded-md border border-border p-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
        <span className="sr-only">Carregando mapa…</span>
      </div>
    );
  }

  return (
    <div className="h-72 w-full overflow-hidden rounded-md border border-border">
      <MapContainer
        className="h-full w-full"
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        {/* Tiles OpenStreetMap — gratuitos, sem chave; attribution legal obrigatória */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {position ? (
          <Marker
            position={position}
            icon={spotMarkerIcon()}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const latLng = (event.target as L.Marker).getLatLng();
                onChange(latLng.lat, latLng.lng);
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
