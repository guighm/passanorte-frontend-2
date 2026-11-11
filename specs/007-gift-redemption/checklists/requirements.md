# Specification Quality Checklist: Concessão de Brindes — Área do Funcionário (SPE-06)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-10
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *exceção deliberada e justificada: a seção "Contrato da API" é exigida pelo Princípio I da constituição (nota de escopo no topo); a concessão (`POST /gamification/redemptions`) foi verificada contra o OpenAPI real nesta sessão, e a validação entra como "contrato esperado" registrada para o backend; requisitos (FR-*) e critérios de sucesso permanecem agnósticos — a escolha da biblioteca de scanner é explicitamente do plan*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified *(12 cenários, incl. código desconhecido/já utilizado/rota incompleta/sem estoque, QR lido duas vezes, câmera indisponível, sessão expirada, payload fora do contrato)*
- [x] Scope is clearly bounded *(validação+concessão de código está aqui; geração do código e UI do turista (RF36) é o app Kotlin — fora daqui; estoque/rotas é SPE-05; matrículas (/enrollments) fora daqui; histórico de concessões fora do escopo v1)*
- [x] Dependencies and assumptions identified *(depende da SPE-01 — sessão/RBAC/BFF/guardas — e da SPE-03 — catálogo de pontos para o seletor; SPE-05 fornece o brinde e o saldo; endpoint de validação é contrato esperado a implementar/confirmar pelo backend)*

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows *(US1 leitura+conferência, US2 confirmação+desfechos, US3 RBAC — prioridades P1/P1/P2)*
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification *(mesma exceção governada pela constituição — ver Content Quality)*

## Notes

- Contrato extraído do **OpenAPI real** da API FastAPI (`API_BASE_URL`, ex.
  `http://localhost:8010`) em 2026-11-10 — não é baseline inventado: conferido
  contra `paths` da tag `Gamification` e `components.schemas`
  (`RedemptionCreateRequest`, `RedemptionView`, `RedemptionPrizeView`,
  `RedemptionCodeView`) e o `summary` documentado do endpoint
  ("201; 409 already used or insufficient stock — the code stays valid; 404
  unknown code/spot — RF36/Q3").
- **Descoberta determinante de escopo**: o Swagger real não publica endpoint de
  validação/pré-visualização — só a concessão única. A etapa de conferência do
  RF21 (exigida pelo owner) está registrada como **contrato esperado** na spec
  (seção 2 de "Contrato da API") para o backend implementar/confirmar —
  mecanismo constitucional (Princípio I, Governança 5). SC-007 mantém o
  endpoint como item obrigatório do compare de contrato.
- Probes pendentes registrados ao fim de "Contrato da API": `errorCode` exatos
  por desfecho; semântica do `spotId` (posto do funcionário × `pickupSpotId`
  do turista); papel do chamador (funcionário × administrador); confirmação do
  "code stays valid" em 409 de estoque — resolução por probe em sessão com
  role real durante o plan/implement (padrão SPE-02 T005 / SPE-03 T004 /
  SPE-04 / SPE-05).
- Iterações de validação: 2 (1ª: faltava seção "Edge Cases" — acrescentada;
  2ª: aprovada sem falhas; marcadores de [NEEDS CLARIFICATION]: 0 — decisões
  ambíguas resolvidas como suposições registradas em "Assumptions": ponto de
  retirada via seletor da SPE-03 com padrão por sessão, código como string
  opaca sem validação de formato local, admin também opera a concessão, sem
  histórico de concessões nesta spec, scanner por câmera do navegador com
  fallback manual).
- Clarificações pendentes para `/speckit-clarify` (opcionais, não críticas):
  exigir confirmação secundária (digitar nome do brinde) antes de conceder;
  lembrar o ponto de retirada entre atendimentos (conveniência × risco de
  erro).
