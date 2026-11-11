// Tipos espelhos do contrato Dashboard (SPE-07 T002) — fonte de verdade:
// contracts/dashboard-api.md, extraído do OpenAPI REAL (tag `Dashboard`,
// 2026-11-10) em `http://localhost:8010` (Princípio I). Módulo puro:
// nenhuma validação de runtime aqui — parsers em `../api/contract.ts`.
// O painel é somente-leitura (FR-002) e não persiste nada (RNF08).

/** Marcador do mapa de calor (RF06) — `spotId: null` ⇒ marcador DE REGIÃO
 * (`groupBy=region`); a API envia em ordem decrescente de `weight` e o
 * cliente JAMAIS reordena (contract rule 2). */
export interface HeatmapMarker {
  spotId: number | null;
  name: string;
  latitude: number;
  longitude: number;
  weight: number; // int ≥ 0
}

export interface HeatmapResponse {
  markers: HeatmapMarker[];
}

/** Agregados do contador de acessos (RF07): `uniqueTouristDays` conta
 * pares turista×dia distinto; `daily` é ascendente e lista SOMENTE dias
 * COM eventos (janela vazia ⇒ zeros + lista vazia — contrato). */
export interface AccessDailyCount {
  date: string; // ISO YYYY-MM-DD (fuso da cidade — "city-tz day")
  uniqueTourists: number; // int ≥ 0
  accessEvents: number; // int ≥ 0
}

export interface AccessCountsResponse {
  period: string; // eco do enviado: today | week | month | custom
  uniqueTouristDays: number; // int ≥ 0
  totalAccessEvents: number; // int ≥ 0
  daily: AccessDailyCount[];
}

/** Linha do ranking (RF08) — `position` e `visits` são do backend; o
 * cliente NUNCA recalcula/reordena (FR-011, contract rule 2). */
export interface RankingItem {
  position: number; // int ≥ 1
  spotId: number;
  name: string;
  visits: number; // int ≥ 1
}

export interface SpotRankingResponse {
  granularity: string; // eco: day | month | year
  referenceDate: string | null; // eco ISO (com query) ou null
  items: RankingItem[];
}

/** Parcela de país (RF09) — % sobre `totalVisitors` (soma ≈ 100). */
export interface CountryShareItem {
  country: string;
  tourists: number; // int ≥ 0
  share: number; // 0–100
}

export interface VisitorCountriesResponse {
  totalVisitors: number; // int ≥ 0
  items: CountryShareItem[];
}

/** Parcela de interesse (RF10) — % sobre `totalSelections` (turista com N
 * interesses conta N vezes: parcelas podem somar acima de 100 — FR-013). */
export interface InterestShareItem {
  interestKey: string;
  interestLabel: string;
  tourists: number; // int ≥ 0
  share: number; // 0–100
}

export interface VisitorInterestsResponse {
  totalVisitors: number; // int ≥ 0
  totalSelections: number; // int ≥ 0 (denominador das parcelas)
  items: InterestShareItem[];
}
