"use client";

// Módulo INTERNO do SpotMapPicker: contém TODAS as importações de
// leaflet/react-leaflet. **Leaflet NÃO é avaliável em Node** ("window is
// not defined" na importação — bug revelado pelo SSR em dev) — este
// módulo só pode ser carregado via `next/dynamic({ ssr: false })` a partir
// de `SpotMapPicker.tsx` (o import estático na cadeia client quebra a
// renderização server-side do segment inteiro).

import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

export interface SpotLeafletMapProps {
  latitude: number | null;
  longitude: number | null;
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

/** Captura cliques no mapa (react-leaflet: handlers via useMapEvents). */
function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function SpotLeafletMap({
  latitude,
  longitude,
  fallbackCenter,
  onChange,
}: SpotLeafletMapProps) {
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
