"use client";

// Módulo INTERNO do SpotMapPicker (SPE-03): importa TODA a lógica de
// marker/handler. **Leaflet NÃO é avaliável em Node** — este módulo só é
// carregado via `next/dynamic({ ssr: false })` a partir de
// `SpotMapPicker.tsx`. SPE-07 T006: a BASE de tiles foi extraída para
// `src/shared/components/OsmBaseMap` (Constraint 3 — integração definida
// uma única vez); este módulo agora só compõe o marker arrastável e o
// handler de clique sobre a base — comportamento PRESERVADO da SPE-03.

import { useMemo } from "react";
import L from "leaflet";
import { Marker, useMapEvents } from "react-leaflet";
import LeafletBaseMap from "@/shared/components/OsmBaseMap/LeafletBaseMap";
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
    <LeafletBaseMap
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-72 w-full"
    >
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
    </LeafletBaseMap>
  );
}
