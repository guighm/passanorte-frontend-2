# Specification Quality Checklist: Rotas Turísticas e Estoque de Brindes (SPE-05)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-10
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *exceção deliberada e justificada: a seção "Contrato da API" é exigida pelo Princípio I da constituição (nota de escopo no topo); o seletor de pontos reusa a listagem da SPE-03 e DataTable/estados são reuso do Princípio IV; requisitos (FR-*) e critérios de sucesso permanecem agnósticos*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded *(concessão ao turista RF21 / POST /redemptions é SPE-06 — fora daqui; matrículas de turista nas rotas — endpoints /enrollments — fora daqui)*
- [x] Dependencies and assumptions identified *(depende da SPE-01 — sessão/RBAC/BFF — e da SPE-03 — catálogo de pontos; SPE-06 depende desta)*

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification *(mesma exceção governada pela constituição — ver Content Quality)*

## Notes

- Contrato extraído do **OpenAPI real** da API FastAPI (`API_BASE_URL`, ex.
  `http://localhost:8010`) em 2026-11-10 — não é baseline inventado: rotas,
  payloads, schemas e descrições de erro conferidos contra `paths` da tag
  `Gamification` e `components.schemas` (`RouteCreateRequest`,
  `RouteUpdateRequest`, `TouristRouteView`, `RouteSummaryView`,
  `RoutePrizeView`, `PrizeStockUpdateRequest`, `RedemptionCreateRequest`,
  `RedemptionView`). Decisões de escopo antes ambíguas ficaram resolvidas
  **pelo contrato real**: brinde nasce embutido na rota (sem catálogo
  independente), brinde não editável pós-criação, remoção = arquivamento com
  histórico, ajuste de estoque via endpoint próprio com guarda de reservas.
- Pendências registradas ao fim de "Contrato da API" (valores exatos de
  `status` ativa × arquivada; comportamento do DELETE de pontos frente a
  rotas que os referenciam) com resolução por **probe em sessão
  administrador real** durante o plan/implement — mesmo padrão da SPE-02
  T005 / SPE-03 T004 / SPE-04.
- Iterações de validação: 1 (aprovada sem falhas; marcadores de [NEEDS
  CLARIFICATION]: 0 — decisões ambíguas resolvidas como suposições
  registradas em "Assumptions": página dedicada com rota própria, esgotado
  (0) como destaque obrigatório com limiar "baixo" opcional no plan, seletor
  de pontos carrega todas as páginas do catálogo).
- Clarificações pendentes para `/speckit-clarify` (opcionais): formato do
  formulário (página dedicada × wizard da SPE-03) e limiar de "estoque
  baixo" na UI.
