// Tipos da feature benefits — concessão de brindes (SPE-06 — data-model.md /
// contracts/gamification-api.md). Princípios I e II: apenas os campos do
// contrato; a concessão/baixa/invalidação são do backend — o painel lê e
// reflete, nunca calcula. O código de resgate nasce no backend (RF36, app
// do turista); aqui ele só é exibido, validado e enviado.

/** Corpo de validação E de concessão (contrato: RedemptionCreateRequest,
 * compartilhado pelos dois endpoints — §1 REAL e §2 esperado). */
export type RedemptionCreateBody = {
  /** Código único de resgate (1–128) — câmera (decode) ou entrada manual. */
  code: string;
  /** Ponto de retirada ≥ 1 — seletor da SPE-03; sugerido editável (FR-010). */
  spotId: number;
};

/** Brinde embutido na resposta da concessão (contrato real: RedemptionPrizeView).
 * `stockQuantity` é o PÓS-BAIXA — o painel apenas reflete (Princípio II). */
export type RedemptionPrizeView = {
  id: number;
  /** 1–200 — nasce com a rota (SPE-05); exibido no registro de sucesso. */
  name: string;
  /** ≥ 0 — valor já deduzido pelo backend na concessão (FR-005). */
  stockQuantity: number;
};

/** Registro da concessão confirmada (contrato REAL §1: RedemptionView, 201). */
export type RedemptionView = {
  /** Código CONSUMIDO pela concessão (revalidações futuras ⇒ 409). */
  code: string;
  prize: RedemptionPrizeView;
  routeId: number;
  /** Identificador opaco do turista — sem PII na UI (RNF08/Princípio III). */
  touristId: number;
  /** Ponto de retirada efetivo gravado pelo backend. */
  pickupSpotId: number;
  /** Quem concedeu (operador da sessão autenticada — do backend). */
  concededBy: string;
  /** Instante da concessão (ISO date-time — do backend). */
  usedAt: string;
};

/** Status do código na conferência (contrato esperado: apenas "valid"
 * desencadeia conferência; consumido ⇒ 409 tratado como desfecho). */
export type RedemptionCodeStatus = "valid";

/** Dados de conferência da validação — contrato ESPERADO §2:
 * RedemptionPreviewView de `POST /gamification/redemptions/validate`
 * (mock governado até o compare — D4; Governança 5). */
export type RedemptionPreviewView = {
  /** Mesmo código validado — referência para a redigitação de confirmação. */
  code: string;
  codeStatus: RedemptionCodeStatus;
  /** Rota concluída (id + nome) — FR-003. */
  route: { id: number; name: string };
  /** Apenas "completed" desencadeia conferência (contrato; parser filtra). */
  enrollmentStatus: string;
  prize: {
    id: number;
    name: string;
    /** Saldo ATUAL (sem consumo — a validação não deduz, FR-003). */
    stockQuantity: number;
    /** Disponibilidade para concessão (false ⇒ desfecho sem estoque, FR-007). */
    available: boolean;
  };
  /** Opcional — se presente, pré-marca o seletor (cross-check P4 do probe). */
  pickupSpotId?: number;
};

/** Desfecho do fluxo de conferência/concessão (FR-006 — nunca colapsar
 * desfechos diferentes em mensagem genérica). */
export type RedemptionOutcome = "success" | "invalid" | "already-used" | "incomplete" | "no-stock";

/** Catálogo do papel (contrato esperado P6: `GET /gamification/pickup-spots`
 * — fonte própria do funcionário; as rotas de listing administrativa e
 * turística 403 para o papel — probe real). */
export type PickupSpotsResponse = {
  items: { id: number; name: string }[];
};
