# Research: Concessão de Brindes — Área do Funcionário (SPE-06)

**Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Decisões D1..D8; TODAS as marcas NEEDS CLARIFICATION da especificação já foram
resolvidas nas 3 sessões de clarify (5 clarificações, 0 marcadores pendentes).
Pendências restantes são **probes de contrato** (contrato real vs. esperado —
contratos/gamification-api.md §4 e D7), executadas na implementação e não aqui.

## D1. Biblioteca de scanner (câmera — QR code/código de barras)

- **Decision**: **`@zxing/browser` 0.2.1** (+ peer `@zxing/library` 0.23.0) —
  leitura contínua por câmera com `BrowserMultiFormatReader` +
  `IScannerControls` (start/stop explícito), decodificação de QR Code **e**
  Code 128 (hints restritos à dupla que o app do turista produz), disparo da
  validação no callback de decode (clarificação Q4 — validação automática ao
  ler). Dependência livre e **MIT** (registra em `pnpm view` 2026-11-10).
- **Rationale**: (i) **mantida** — último release 2026-07 (html5-qrcode está
  parado desde 2023-04); (ii) oferece **controle fino de câmera**
  (`controls.stop()`/reinício), requisito direto do FR-009 (câmera **pausada**
  na tela pós-sucesso até "novo atendimento") e entre estados da máquina
  (D6); (iii) wrapper fino sobre a biblioteca de decodificação clássica
  (ZXing), sem UI acoplada nem manipulação de DOM escondida (html5-qrcode);
  (iv) gratuita/open source (RNF15/Princípio III) — MIT, sem servidor, sem
  chave, sem CDN (render 100% client-side).
- **Alternatives considered**: `html5-qrcode` (Apache-2.0, popular, mas sem
  release desde 2023 e com UI/DOM acoplados — risco de manutenção e de
  conflito com React 19 em StrictMode); `BarcodeDetector` nativo do navegador
  (não cobre Firefox/Safari — terminal do posto não pode depender do
  Chromium); `jsQR` (somente QR — não cobre código de barras, RF21).
- **Sanção (Constraint 1)**: dependência nova exigida pelo RF21 (leitura por
  câmera não é coberta por nenhuma lib existente da stack); justificativa
  registrada aqui e no plan (Constitution Check). Ação de **governança
  acompanhante**: emenda PATCH da constituição acrescentando
  `@zxing/browser`+`@zxing/library` à lista sancionada da Constraint 1,
  executada junto com a implementação (precedente react-leaflet da SPE-03).

## D2. Estrutura de módulo, rota e RBAC

- **Decision**: módulo novo **`src/features/benefits`** (`api/`, `components/`,
  `types/`) — nome segue a árvore de rotas do Princípio IV (`(panel)/benefits`),
  mesmo critério da SPE-05 (`features/tours`). A página `/(panel)/benefits`
  (placeholder da SPE-01 — `PlaceholderSection` com spec "SPE-06") é
  **substituída** pela tela do fluxo (Server Component fino → view client).
  `NAV_ITEMS`/guardas/`homePathForRole` **NÃO mudam**: `roleCanAccess` já
  libera `/benefits` para `admin` **e** `employee` (guards da SPE-01) e o
  funcionário não vê mais nada que não `/benefits` (RBAC de superfície
  existente cobre FR-001/US3 sem alteração).
- **Rationale**: entidade canônica do painel é "área de benefícios/concessão"
  (rota `/benefits` desde a SPE-01); nenhuma nova rota admin é criada.
- **Alternatives considered**: módulo `redemptions` (nome técnico não alinhado
  à navegação e ao vocabulário de UI); nova rota `/benefits/scanner` (desnecessária
  — fluxo único em uma tela com máquina de estados D6).

## D3. Reuso entre features (Princípio IV)

- **Decision**: **seletor do ponto de retirada** consome o catálogo da SPE-03
  via os mesmos hooks/componentes aprovados na cadeia SPE-04 → SPE-05:
  `useSpotCatalogQuery` e `SpotSelector` de `@/features/events`,
  `spot-name`/`parseSpotListResponse` de `@/features/events` +
  `@/features/attractions` (mesmo padrão sanctioned — "tours importa de
  events/attractions"). Demais transversais: `Button`, `LoadingState`/
  `EmptyState`/`ErrorState` (`src/shared/components`), classificador de erros
  `src/shared/lib/api-error.ts` ( classes→kind), `bff.ts` (client), `cn`,
  `QueryProviders`. Novo e local: `messages.ts` pt-BR da feature (padrão
  tours/attractions/employees/events) e `contract.ts` com parsers puros
  (`RedemptionView` REAL + `RedemptionPreviewView` esperado).
- **Rationale**: FR-010 (ponto de retirada por atendimento, sugestão editável)
  é o mesmo requisito de seletor da SPE-04/SPE-05 com sugestão inicial —
  `SpotSelector` recebe `defaultValue`/estado controlado da view.
- **Alternatives considered**: copiar o seletor (violaria "nenhum utilitário
  duplicado", Princípio IV) — **exceção executada com justificativa (T005 em
  diante)**: o probe T017 revelou que `GET /tourist-spots` (fonte do
  `SpotSelector`) é **admin-only** e `/discover` é tourist-exclusive (P6 do
  contrato) — o seletor da SPE-04 está acoplado ao catálogo administrativo e
  mudar a fonte dele quebraria os consumidores existentes. A feature usa um
  seletor LOCAL mínimo (`PickupSpotSelector`) alimentado pelo catálogo do
  papel (`GET /gamification/pickup-spots` — contrato esperado com mock D4+),
  mantendo os 3 estados de Princípio V do padrão. Reuso de `spot-name` não se
  aplica (fonte própria). A promoção de um seletor genérico multi-fonte fica
  para review futuro.

## D4. Mock governado do endpoint de validação (contrato esperado)

- **Decision**: a chamada `POST /gamification/redemptions/validate` é
  construída contra o **contrato esperado** da spec com **mock local na camada
  api da feature**: `src/features/benefits/api/mock.ts` com marcador
  `// MOCK (temporary): remove when /gamification/redemptions/validate is live`
  e um **único ponto de chave** `VALIDATE_ENDPOINT_LIVE = false` em
  `features/benefits/api/queries.ts` — quando false, `validateCode()` resolve
  com o mock (fixture fiel ao `RedemptionPreviewView` + desfechos de erro);
  quando true, faz a chamada real pelo túnel BFF. A **concessão** nunca é
  mockada (endpoint real existe na API — Princípio I) — confirmar/consultar
  usa `POST /redemptions` real desde o primeiro dia.
- **Rationale**: replicação do padrão D6 da SPE-01 (mocks governados, 1
  arquivo por endpoint, nenhuma tela sabe se está em mock); risco de
  divergência confinado; a task de **compare de contrato** (Governança 5)
  vira o flip da chave + conferência campo a campo — quando o backend publicar
  o endpoint (ou design equivalente, ex. flag de preview na concessão), este
  arquivo e `contracts/gamification-api.md` são atualizados.
- **Alternatives considered**: MSW/wire-mock pesado (desnecessário para 1
  endpoint — mesma conclusão da SPE-01 D6); bloqueio da feature à espera do
  backend (rejeitada na clarificação Q1); mock na concessão (violaria
  Princípio I — o endpoint real existe e é a autoridade da baixa/invalidação).

## D5. Camada de dados e mutações

- **Decision**: padrão estabelecido da SPE-02 rodada 2 / SPE-03 / SPE-04 /
  SPE-05: **TanStack Query** por túnel BFF com parsers puros campo a campo em
  `contract.ts` (payload divergente ⇒ `ContractViolationError` — Princípio I);
  mutações `useValidateCode` (query mockada/real) e `useConfirmRedemption`
  (POST real) com invalidação das queries de catálogo de rotas/pontos quando
  aplicável; mensagens pt-BR em `messages.ts` mapeando `errorCode`
  (`resource_not_found`, `conflict`×variantes, `validation_error`) — as
  variantes exatas de desfecho são **cobertas por probe** (P1) e pré-mapeadas
  com fallback acionável (padrão SPE-05: genérico cobre enquanto a variante
  não é confirmada).
- **Rationale**: consistência com todas as features do painel; sem Server
  Action nesta feature (nenhum campo de form sensível — código e ponto são
  operação client-side de posto; token segue anexado só no túnel, Princípio III).
- **Alternatives considered**: Server Actions (padrão de login da SPE-01 —
  aqui não há vantagem; estados de máquina do fluxo são de UI client-side);
  Zustand para a máquina de estados (estados cabem em `useState` local da
  view única — nenhum estado global multi-tela nesta spec).

## D6. Máquina de estados do fluxo de concessão (tela única)

- **Decision**: uma única página `/benefits` com máquina de estados client-side
  na view: `idle-scanning` (câmera ligada + entrada manual alternativa) →
  `validating` → `conference` (dados da rota/brinde/estoque + ponto de
  retirada sugerido editável + redigitação do código habilitando confirmação)
  → `conceding` → `success` (registro + câmera PAUSADA + botão "novo
  atendimento" — FR-009) **ou** `outcome-failure` (mensagem distinta por
  desfecho; para sem-estoque: aviso de que o código permanece válido; volta ao
  `idle-scanning` sem consumir o código — FR-007/FR-008). Câmera controlada
  por `IScannerControls`: `stop()` ao sair de `idle-scanning`, re-start no
  retorno (D1).
- **Rationale**: o fluxo do posto é linear e cabe em uma tela (Assumption/D2);
  pausar a câmera na conferência evita re-leitura do QR durante a redigitação
  (edge case de leitura redundante) e na tela de sucesso cumpre FR-009.
- **Alternatives considered**: multi-página com query params (perdia o estado
  da câmera e adicionava navegação ao ciclo de 30 s do SC-001); fluxo em
  diálogo/modal (padrão wizard da SPE-03 foi descartado pelo owner para
  formulários operacionais — SPE-04/SPE-05 seguem páginas; aqui a tela inteira
  É o posto).

## D7. Probes de contrato (método)

Sessão **com papéis reais** (padrão SPE-02 T005 / SPE-03 T004 / SPE-04 /
SPE-05 T004) — 1ª task da implementação, atualizando
`contracts/gamification-api.md` e `messages.ts` antes da UI depender deles:

1. Credenciar **employee** (criação via admin RF04, login real) e conferir
   papel do chamador em `POST /redemptions` (concede? admin também?).
2. Credenciar **turista de fixture**: `POST /api/v1/tourists` + login,
   `POST /gamification/routes/{id}/enrollments` (rota ativa da SPE-05),
   marcar visitações em todos os pontos (`POST /visitation/spots/{spot_id}/visits`
   com GPS nas coordenadas do ponto), obter código real via
   `GET /gamification/enrollments/{id}` (`redemptionCode`).
3. Com o código real: **404/409/422 por desfecho** na concessão + (quando
   publicada) na validação — `errorCode` exatos por sub-caso (inválido ×
   já utilizado × rota incompleta × sem estoque).
4. **Semântica do `spotId`**: concession com `pickupSpotId` do turista vs. ponto
   diferente — 404, 409 ou aceita? (registro em §4).
5. **"code stays valid"**: 409 de estoque não consome — revalidar código após.
   Código usado em validação mock vs real durante compare.

## D8. Validação (testes)

- **Decision**: `quickstart.md` (cenários US1–US3 com desfechos, contra o
  backend real de `API_BASE_URL`, com validação em modo mock até o compare) +
  gates `pnpm build`/`pnpm lint` sem erros (Constraint 6); sem framework de
  testes novo (padrão D7 da SPE-01).
- **Alternatives considered**: Vitest (fora do escopo — decisão de
  infraestrutura do projeto inteiro, não desta feature).
