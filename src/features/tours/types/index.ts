// Tipos da feature tours (SPE-05 — data-model.md / contracts/
// gamification-api.md: contrato REAL, OpenAPI 2026-11-10, tag
// "Gamification"). Princípios I e II: apenas os campos do contrato — SEM
// campos derivados (spotCount vem pronto do backend na listagem); o
// brinde é EMBUTIDO na rota (nasce com ela — não existe catálogo
// independente de brindes no contrato) e NÃO é editável após a criação
// (RouteUpdateBody não recebe campo de brinde). Nomes de ponto resolvem-
// se pelo catálogo da SPE-03 (contrato traz apenas spotId — RNF06, nada
// fixado no código).

/** Item da lista ORDENADA de pontos de uma rota (create/read/edit). */
export type RouteSpotEntry = {
  /** Ponte para o catálogo da SPE-03 — backend revalida (404 em create/edit). */
  spotId: number;
  /** Posição 1..n — derivada do índice da lista no cliente, nunca editável direto. */
  displayOrder: number;
};

/** Brinde embutido em toda leitura de rota (contrato: RoutePrizeView). */
export type RoutePrizeView = {
  /** Identificador do brinde — alvo do PATCH de estoque (RF20). */
  id: number;
  /** 1–200 caracteres — nasce com a rota e NÃO é editável pós-criação. */
  name: string;
  /** ≥ 0 — baixa na concessão é do backend (RF21); o painel apenas reflete. */
  stockQuantity: number;
};

/** Leitura completa da rota (create/edit/detail — contrato: TouristRouteView). */
export type TouristRouteView = {
  /** Identificador atribuído pelo backend (chave de cache e rota de edição). */
  id: number;
  /** 1–200 caracteres (limite do contrato). */
  name: string;
  /** 1–2000 caracteres (limite do contrato). */
  description: string;
  /** Lista ORDENADA — sem lacunas (displayOrder 1..n), mínimo 1 item. */
  spots: RouteSpotEntry[];
  /** Embutido — nasce com a rota (F1 do backend). */
  prize: RoutePrizeView;
  /** String do contrato — valores exatos ativa × arquivada confirmados pelo probe P1. */
  status: string;
};

/** Item da listagem (contrato: RouteSummaryView — sem paginação, YAGNI). */
export type RouteSummaryView = {
  id: number;
  name: string;
  description: string;
  /** Contagem derivada no backend (≥ 1) — a listagem NÃO exibe nomes de pontos. */
  spotCount: number;
  prize: RoutePrizeView;
  status: string;
};

/** GET /gamification/routes — SEM paginação neste contrato: todas as
 * linhas correspondentes (includeArchived alterna arquivadas). */
export type RouteListResponse = {
  items: RouteSummaryView[];
};

/** POST /gamification/routes — "every field required" (contrato,
 * additionalProperties: false). O brinde NASCE AQUI (embutido). */
export type RouteCreateBody = {
  name: string;
  description: string;
  /** Mínimo 1 item; order 1..n sem lacunas (serializada pelo cliente). */
  spots: RouteSpotEntry[];
  prize: {
    name: string;
    initialStock: number;
  };
};

/**
 * PATCH /gamification/routes/{id} — "ALL fields optional" (contrato);
 * `spots` informada é revalidada no backend (mínimo 1). O cliente envia
 * SOMENTE o diff (padrão SPE-04). NUNCA envia campo de brinde
 * (RouteUpdateRequest não o aceita — FR-008).
 */
export type RouteUpdateBody = {
  name?: string;
  description?: string;
  spots?: RouteSpotEntry[];
};

/** PATCH /gamification/prizes/{id} — guarda do backend: ≥ 0 e ≥ reservas
 * comprometidas (422 caso contrário — pendência P4). */
export type PrizeStockUpdateBody = {
  stockQuantity: number;
};
