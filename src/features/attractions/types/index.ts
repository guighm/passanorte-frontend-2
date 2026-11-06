// Tipos da feature attractions (SPE-03 — data-model.md / contracts/
// spots-api.md: contrato real, OpenAPI 2026-11-06). Princípios II e IV:
// nenhum dado da cidade/categoria/centro fixado no código (RNF06) —
// catálogo e weekday vêm/confirmam-se via API (probe T004).

/** Status de operação — enum FECHADO do contrato (`SpotStatus`):
 * valor desconhecido ⇒ violação explícita (nunca badge inventado). */
export const SPOT_STATUS_OPEN = "open";
export const SPOT_STATUS_TEMPORARILY_CLOSED = "temporarilyClosed";
export const SPOT_STATUS_PERMANENTLY_CLOSED = "permanentlyClosed";

export const SPOT_STATUSES = [
  SPOT_STATUS_OPEN,
  SPOT_STATUS_TEMPORARILY_CLOSED,
  SPOT_STATUS_PERMANENTLY_CLOSED,
] as const;

/** Chaves de dia da semana usadas pela UI do cronograma (labels pt em
 * ScheduleEditor). O vocabulário REAL do backend é confirmado pelo probe
 * (T004) — se diferente, ajusta-se APENAS este mapeamento (nada hard-coded
 * de dados da cidade). */
export const SPOT_SCHEDULE_WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** type alias (não interface): linha do DataTable v9 exige index signature implícita. */
export type SpotStatus = (typeof SPOT_STATUSES)[number];

export type SpotScheduleEntry = {
  /** Vocabulário exato fixado pelo probe (T004/research D7) — string não-vazia no parse. */
  weekday: string;
  /** Formato do contrato: HH:MM puro (`^\d{2}:\d{2}$`). */
  opensAt: string;
  closesAt: string;
};

export type SpotView = {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  /** Raio de tolerância ( metros) para validação de presença GPS no app (RF32) — opcional. */
  toleranceRadiusM: number | null;
  status: SpotStatus;
  /** Chaves do catálogo ("raw catalog keys") — rótulos pt vêm do catálogo (FR-010). */
  categories: string[];
  schedule: SpotScheduleEntry[];
  createdAt: string;
  updatedAt: string;
};

export type SpotListResponse = {
  items: SpotView[];
  total: number;
  page: number;
  pageSize: number;
};

/** Categoria do catálogo (CategoryView do OpenAPI: key + label). */
export type CategoryView = {
  key: string;
  label: string | null;
};

/** POST /tourist-spots (obrigatório; `additionalProperties: false`). */
export type SpotCreateBody = {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  status?: SpotStatus;
  toleranceRadiusM?: number;
  /** mínimo 1 (contrato). */
  categories: string[];
  /** mínimo 1 entrada (contrato). */
  schedule: SpotScheduleEntry[];
};

/** PATCH /tourist-spots/{id} — todos os campos opcionais (parcial);
 * `toleranceRadiusM` aceita `number|null` no contrato de update (limpar o raio). */
export type SpotUpdateBody = {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  status?: SpotStatus;
  toleranceRadiusM?: number | null;
  categories?: string[];
  schedule?: SpotScheduleEntry[];
};
