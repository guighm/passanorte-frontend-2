"use client";

// SpotMapPicker (SPE-03 T010 — UMA ÚNICA integração de mapa do painel,
// Constraint 3 da constituição, com a lib sancionada e instalada
// @vis.gl/react-google-maps — decisão do owner): interface mínima p/
// reuso pela SPE-07. APIProvider exige `apiKey` — sempre via env
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Princípio III; chave NUNCA em código).
// Clique no mapa define a posição (MapMouseEvent.detail.latLng —
// confirmado nos tipos, T001/`Map.onClick`). Sem chave: fallback
// acessível (aviso + campos manuais do formulário — nunca crash).
// Centro inicial (FR-009/clarificação): posição informada em edição; em
// cadastro, primeiro ponto da listagem (`fallbackCenter`) — sem dados,
// visão padrão da lib; NADA fixado no código (RNF06).
//
// Entrada manual de coordenadas (FR-009) vive no SpotFormDialog — este
// componente só complementa (bidirecional via props/onChange).

import { APIProvider, Map, Marker, useApiIsLoaded } from "@vis.gl/react-google-maps";
import { useMemo } from "react";

export interface SpotMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  /** Centro para CADASTRO (primeiro ponto da listagem vigente ou null). */
  fallbackCenter: { latitude: number; longitude: number } | null;
  onChange: (latitude: number, longitude: number) => void;
}

export default function SpotMapPicker({ latitude, longitude, fallbackCenter, onChange }: SpotMapPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined;

  const center = useMemo(() => {
    if (latitude !== null && longitude !== null) return { lat: latitude, lng: longitude };
    if (fallbackCenter) return { lat: fallbackCenter.latitude, lng: fallbackCenter.longitude };
    return null; // sem dados: visão padrão da lib (nada fixado)
  }, [latitude, longitude, fallbackCenter]);

  if (!apiKey) {
    return (
      <div
        role="note"
        className="text-body rounded-md bg-warning-soft px-3 py-2 text-warning-soft-foreground"
      >
        Mapa indisponível nesta instalação (sem chave do Google Maps configurada).
        Defina a localização digitando a latitude/longitude abaixo.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <ApiLoadedGate latitude={latitude} longitude={longitude} center={center} onChange={onChange} />
    </APIProvider>
  );
}

/** Exibe o mapa apenas quando o API do Google terminou de carregar
 * (`useApiIsLoaded` — deve viver SOB o APIProvider); skeleton distinto e
 * anunciável enquanto carrega (Princípio V, sem flash de mapa vazio). */
function ApiLoadedGate({
  latitude,
  longitude,
  center,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  center: { lat: number; lng: number } | null;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const loaded = useApiIsLoaded();
  if (!loaded) {
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
      <Map
        className="h-full w-full"
        center={center ?? undefined}
        zoom={center ? 13 : 1}
        gestureHandling="greedy"
        onClick={(event) => {
          const latLng = event.detail.latLng;
          if (latLng) onChange(latLng.lat(), latLng.lng());
        }}
      >
        {latitude !== null && longitude !== null ? <Marker position={{ lat: latitude, lng: longitude }} /> : null}
      </Map>
    </div>
  );
}
