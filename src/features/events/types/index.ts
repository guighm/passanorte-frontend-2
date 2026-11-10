// Tipos da feature events (SPE-04 — data-model.md / contracts/
// events-api.md: contrato real, OpenAPI 2026-11-10). Princípios I e II:
// apenas os campos do contrato — SEM status/createdAt/nome do ponto
// embutido; data de ocorrência é date puro (sem horário/fuso) e SEM
// restrição de período no cliente (clarificação 2026-11-10 — backend é
// a autoridade); nomes de ponto resolvem-se pelo catálogo da SPE-03
// (RNF06 — nada fixado no código).

/** type alias (não interface): linha do DataTable v9 exige index signature implícita. */
export type EventView = {
  /** Identificador atribuído pelo backend (nunca digitado — chave de cache e rota de edição). */
  id: number;
  /** Vínculo obrigatório com o ponto turístico (revalidado pelo backend: 404/409). */
  spotId: number;
  /** Date puro `YYYY-MM-DD` (sem horário) — datas passadas permitidas (clarificação Q1). */
  occurrenceDate: string;
  /** 1–2000 caracteres (limite do contrato). */
  description: string;
  /** Preço ≥ 0 com duas casas (`EventView` lê SEMPRE number; 0 = gratuito). */
  ticketPrice: number;
};

/** Listagem administrativa — SEM paginação neste contrato: todas as linhas
 * correspondentes, ordem `(occurrenceDate, id)` ascendente respeitada. */
export type EventListResponse = {
  items: EventView[];
};

/** POST /events — "every field required" (contrato, additionalProperties: false). */
export type EventCreateBody = {
  spotId: number;
  occurrenceDate: string;
  description: string;
  /** Painel envia NUMBER (padrão registrado após probe T004 — contrato aceita string). */
  ticketPrice: number;
};

/**
 * PATCH /events/{id} — "ALL fields optional; omitted fields stay
 * unchanged; an empty patch is a no-op (200)". O cliente envia SOMENTE o
 * diff (research D8). NUNCA envia objeto vazio (submete nada antes).
 */
export type EventUpdateBody = Partial<EventCreateBody>;
