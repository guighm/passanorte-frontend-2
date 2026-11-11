# Tasks: Dashboard e Insights (SPE-07)

**Input**: Design documents from `/specs/008-admin-dashboard-insights/`

**Prerequisites**: plan.md ✅ · spec.md ✅ (6 clarificações) · research.md ✅ (D1–D8) · data-model.md ✅ · contracts/dashboard-api.md ✅ · quickstart.md ✅

**Tests**: Nenhuma suíte automatizada foi solicitada — validação por `pnpm build`/`pnpm lint` (Constraint 6) + cenários do `quickstart.md` em cada checkpoint (padrão das SPE-01..06).

**Organization**: Tasks agrupadas por user story (spec: US1 heatmap P1, US2 ranking P2, US3 contador P3, US4 países P4, US5 interesses P5); a página, o seletor global e a camada de dados são fundação compartilhada.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto web único (Next.js App Router) — caminhos conforme plan.md:

```text
src/features/dashboard/{api,components,types}
src/shared/components/OsmBaseMap/
src/app/(panel)/admin/dashboard/page.tsx
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Estrutura do módulo da feature (dep `recharts` 3.10.1 já instalada — emenda 2.2.0)

- [x] T001 Criar a árvore do módulo `src/features/dashboard/{api,components,types}` (diretórios vazios com os módulos dos T002–T005; nenhuma outra pasta — plan.md Project Structure)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Camada de dados + base de mapa + casca da página — NENHUMA card story começa antes

**⚠️ CRITICAL**: Todos os 5 cards dependem destes módulos

- [x] T002 [P] Criar tipos espelhos do contrato em `src/features/dashboard/types/index.ts` — `HeatmapMarker` (spotId `int|null` — null ⇒ região; name; latitude −90…90; longitude −180…180; weight `int ≥ 0`), `AccessCounts` (period; uniqueTouristDays `int ≥ 0`; totalAccessEvents `int ≥ 0`; daily `AccessDailyCount[]` ascendente, só dias com eventos), `AccessDailyCount` (date ISO; uniqueTourists `int ≥ 0`; accessEvents `int ≥ 0`), `SpotRanking` (granularity `day|month|year`; referenceDate ISO|null; items `RankingItem[]`), `RankingItem` (position `int ≥ 1`; spotId; name; visits `int ≥ 1`), `CountryShare` (country; tourists `int ≥ 0`; share 0–100), `InterestShare` (interestKey; interestLabel; tourists `int ≥ 0`; share 0–100) e `PeriodSelection` (kind `today|week|month|custom`; startDate/endDate ISO — janelas calêndricas correntes, D4: semana seg→dom, mês calendário corrente) — fonte: contracts/dashboard-api.md + data-model.md
- [x] T003 [P] Criar mensagens pt-BR de estado/vazio/erro por card em `src/features/dashboard/api/messages.ts` (padrão `messages.ts` da SPE-03 — nenhum texto fixado fora da feature; vazio do contador: "Nenhum acesso no período", ranking: "Nenhum ponto visitado neste período", países/interesses/mapa análogos; erro sempre com ação de recarregar — FR-015)
- [x] T004 Criar parsers defensivos puros em `src/features/dashboard/api/contract.ts` — `parseHeatmapResponse`, `parseAccessCountsResponse`, `parseSpotRankingResponse`, `parseVisitorCountriesResponse`, `parseVisitorInterestsResponse` (padrão `contract.ts` da SPE-03: `ContractViolationError` com endpoint+campo por divergência — Princípio I; validar constraints do T002 campo a campo; arrays na ordem recebida — NUNCA reordenar no cliente; depends on T002)
- [x] T005 Criar camada de dados TanStack Query em `src/features/dashboard/api/queries.ts` — 5 hooks de leitura (`useHeatmapQuery(groupBy, startDate, endDate)`, `useAccessCountsQuery(period, startDate, endDate)`, `useSpotRankingQuery(granularity, referenceDate, limit)`, `useVisitorCountriesQuery(startDate, endDate)`, `useVisitorInterestsQuery(startDate, endDate)`) sobre `bffJson` com caminhos upstream `api/v1/dashboard/*` e query keys `[... , parâmetros]` (D3 — refetch on period/segment change; `refetchOnWindowFocus` off; staleTime 0 ⇒ refetch ao entrar na página, FR-020; sem polling; depends on T002–T004)
- [x] T006 Extrair a base OSM compartilhada em `src/shared/components/OsmBaseMap/` (MapContainer + TileLayer + CSS + assets servidos pelo bundle, import interno isolado consumível via `next/dynamic({ ssr: false })` — padrão `SpotLeafletMap` da SPE-03, research D2) e migrar `src/features/attractions/components/SpotLeafletMap.tsx`/`SpotMapPicker.tsx` para consumi-la SEM mudar comportamento; regressão: mapa seletor da SPE-03 idêntico no browser (roteiro quickstart 004)
- [x] T007 Criar a casca da página — `src/app/(panel)/admin/dashboard/page.tsx` (tela fina server, substituindo o PlaceholderSection; guardas `/admin/*` já cobertos por `src/proxy.ts`), `src/features/dashboard/components/DashboardView.tsx` (client: grid dos 5 cards + seletor global de período FR-014 — opções hoje/semana/mês/configurável com duas datas, tradução D4 para startDate/endDate, validação startDate ≤ endDate antes de disparar query, estado em `useState`), `src/features/dashboard/components/DashboardCard.tsx` (casca interna dos cards: título, LoadingState/EmptyState/ErrorState por card via props, botão refetch FR-020, estados independentes FR-015) e **stubs mínimos das 5 cards** (`HeatmapCard.tsx`, `SpotRankingCard.tsx`, `AccessCountsCard.tsx`, `CountryDistributionCard.tsx`, `InterestDistributionCard.tsx` — arquivo com shell vazios wireados ao `DashboardCard` via props, SEM hook do endpoint ainda); todos os componentes compilam e renderizam; **as stories T008–T017 apenas PREENCHEM o stub do seu card** (cada card passa a consumir o hook da T005); `pnpm build` + `pnpm lint` limpos

**Checkpoint**: Fundação pronta — página com seletor global e 5 cards cascos; base OSM compartilhada; user stories podem começar (uma por vez, em ordem de prioridade)

---

## Phase 3: User Story 1 - Mapa de calor das visitas (Priority: P1) 🎯 MVP

**Goal**: Card com o mapa da cidade exibindo a concentração de visitas (RF06) sobre a base OSM da SPE-03

**Independent Test**: Abrir o card com visitas registradas e conferir posição, nome e intensidade de cada marcador contra a resposta de `GET /dashboard/heatmap`; alternar spot↔region e recortar período (quickstart US1)

### Implementation for User Story 1

- [x] T008 [US1] Preencher o stub de `src/features/dashboard/components/HeatmapCard.tsx` (T007) — consumir `useHeatmapQuery` com o período global do `DashboardView` (FR-006); alternância `groupBy` spot|region (padrão spot, FR-005) re-query com key própria; `OsmBaseMap` via `next/dynamic({ ssr: false })` (D6 do SSR da SPE-03); um `CircleMarker` por marcador com **escala explícita**: raio mínimo 8px, raio máximo proporcional ao maior `weight` do retorno (resposta com um marcador só ou `weight` 0 ⇒ raio mínimo) e cor em rampa fixa da fração `weight/maxWeight` (Q3 — sem camada de calor), tooltip com `name` legível por teclado (FR-004); `spotId: null` ⇒ marcador de região com chave `region:${index}`; nenhum dado fabricado; estados loading/vazio/erro pelo `DashboardCard` com mensagens do T003; depends on T005–T007
- [ ] T009 [US1] Validar o card contra os 4 cenários do quickstart US1 + regressão do mapa da SPE-03 (T006); `pnpm build` + `pnpm lint` limpos

**Checkpoint**: MVP — um card real consumindo a API real, mapa OSM único funcionando para picker e display

---

## Phase 4: User Story 2 - Ranking dos pontos mais visitados (Priority: P2)

**Goal**: Card com ranking segmentado por dia/mês/ano (RF08), controles próprios de segmento/referência/limite

**Independent Test**: Alternar dia↔mês↔ano e a data de referência; conferir que posição/nome/visitas coincidem com a resposta de `GET /dashboard/spot-ranking` (quickstart US2)

### Implementation for User Story 2

- [x] T010 [US2] Preencher o stub de `src/features/dashboard/components/SpotRankingCard.tsx` (T007) — `useSpotRankingQuery` com controles locais do card (segmento day|month|year, padrão day; referenceDate editável, padrão hoje; limite editável, padrão 5, domínio 1–100 — FR-010/011); linhas com position/name/visits NA ORDEM da API (nunca reordenar — contract rule 2); período vigente do card visível (granularity/referenceDate do eco da resposta); numerais tabulares (SPE-08); estado vazio próprio (nenhum ponto visitado no segmento); estados pelo `DashboardCard`; depends on T005–T007
- [x] T011 [US2] Validar os 4 cenários do quickstart US2 (mudança de segmento dispara nova consulta sem recarregar página — SC-004); `pnpm build` + `pnpm lint` limpos

**Checkpoint**: US1 + US2 funcionando independentemente

---

## Phase 5: User Story 3 - Contador de acessos ao app Passaporte (Priority: P3)

**Goal**: Card com totais de acessos (RF07) por período global + série diária em gráfico de linha

**Independent Test**: Trocar hoje↔semana↔mês↔configurável no seletor global e conferir os totais/série contra `GET /dashboard/access-counts` (quickstart US3)

### Implementation for User Story 3

- [x] T012 [US3] Preencher o stub de `src/features/dashboard/components/AccessCountsCard.tsx` (T007) — `useAccessCountsQuery(period, startDate?, endDate?)`: o `period` nomeado enviado junto (Q1 — o contador recebe period E, quando custom, as datas; FR-007); totais `uniqueTouristDays` + `totalAccessEvents` em destaque com numerais tabulares e o período vigente identificado (FR-008); `Recharts` `LineChart` compacto da série `daily` (Q2 — eixo de datas por dia, labels `Intl.NumberFormat` pt-BR — D7); zero legítimo ⇒ vazio explícito "Nenhum acesso no período" (não erro); estados pelo `DashboardCard`; depends on T005–T007
- [x] T013 [US3] Validar os 3 cenários do quickstart US3 + coerência do período global (SC-002: mudança de período reflete no card sem recarregar página); `pnpm build` + `pnpm lint` limpos

**Checkpoint**: US1–US3 funcionando independentemente

---

## Phase 6: User Story 4 - Distribuição por país de origem (Priority: P4)

**Goal**: Card com a proporção de visitantes por país (RF09) em barras horizontais

**Independent Test**: Conferir que país/contagem/% de cada barra coincide com `GET /dashboard/visitor-countries` para o período global (quickstart US4)

### Implementation for User Story 4

- [x] T014 [US4] Preencher o stub de `src/features/dashboard/components/CountryDistributionCard.tsx` (T007) — `useVisitorCountriesQuery(startDate, endDate)` do período global; `Recharts` `BarChart` vertical (barras horizontais, Q4 — uma por país, contagem e `share`/100% visíveis via `LabelList`, rótulo sempre visível sem depender só de cor — FR-012/FR-018); legenda/interação por teclado; `totalVisitors` 0 ⇒ vazio claro; estados pelo `DashboardCard`; depends on T005–T007
- [x] T015 [US4] Validar os 2 cenários do quickstart US4 (soma das % ≈ 100 com arredondamento; identificável por teclado); `pnpm build` + `pnpm lint` limpos

**Checkpoint**: US1–US4 funcionando independentemente

---

## Phase 7: User Story 5 - Distribuição por interesses (Priority: P5)

**Goal**: Card com a proporção de visitantes por interesses do perfil (RF10) em barras horizontais, com multiplicidade explicada

**Independent Test**: Conferir `interestLabel`/contagem/% de cada barra contra `GET /dashboard/visitor-interests` e que o denominador exibido é `totalSelections` (quickstart US5)

### Implementation for User Story 5

- [x] T016 [US5] Preencher o stub de `src/features/dashboard/components/InterestDistributionCard.tsx` (T007) — `useVisitorInterestsQuery(startDate, endDate)` do período global; `Recharts` `BarChart` vertical idêntico ao padrão do T014 (rótulos de `interestLabel`, chave por `interestKey` — FR-013); **nota UI do denominador com `totalSelections`** — turista conta em cada interesse declarado, parcelas podem somar >100% (clarificação Q4 + edge case); `totalSelections` 0 ⇒ vazio claro; estados pelo `DashboardCard`; depends on T005–T007
- [x] T017 [US5] Validar os 2 cenários do quickstart US5 (turista com N interesses conta N vezes — % somando >100% explicada ao operador); `pnpm build` + `pnpm lint` limpos

**Checkpoint**: Os 5 cards funcionando com dados reais

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Acessibilidade transversal, compare de contrato e validação ponta a ponta

- [x] T018 [P] Pass transversal de acessibilidade: navegação por teclado nos controles dos 5 cards + seletor global (Constraint 6; labels/aria nos gráficos Recharts e tooltip do mapa; SR-only quando aplicável — RNF13)
- [x] T019 [P] Compare de contrato final campo a campo de `contracts/dashboard-api.md` vs Swagger `http://localhost:8010/docs` (Governança 5) — extrair `/openapi.json` de novo e confirmar os 5 endpoints/schemas; divergência ⇒ atualizar spec + contrato antes de seguir (baseline já verificado em 2026-11-10)
- [ ] T020 Executar o roteiro completo de `quickstart.md` com backend no ar — todos os checkpoints das 5 stories + transversais (seletor global, independência de cards com API fora do ar, sob demanda sem polling, SC-001 ≤5s, SC-006 funcionário bloqueado)
- [x] T021 Verificação final de qualidade: `pnpm build` + `pnpm lint` zero erros; nenhuma chamada `fetch` fora do túnel BFF (grep); nenhum dado de cidade/campo de ponto fixado em código (Princípio IV); atualizar `docs/SPECS.md` apenas se ordem/status mudar

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: imediato
- **Foundational (Phase 2)**: depende do Setup — **BLOQUEIA todas as stories** (T002–T003 paralelos; T004 depois do T002; T005 depois de T002–T004; T006 independente dos demais `[P]`; T007 depende de T005+T006)
- **Stories (Phases 3–7)**: em sequência de prioridade P1→P5 (cada checkpoint valida a story antes de avançar; tecnicamente qualquer story pode seguir T007 em qualquer ordem, mas a ordem da prioridade vale para o review)
- **Polish (Phase 8)**: depende das stories desejadas completas (T019 pode rodar em paralelo ao T020)

### User Story Dependencies

- **US1 (P1)**: T007 → T008 → T009
- **US2 (P2)**: T007 → T010 → T011 (independente de US1)
- **US3 (P3)**: T007 → T012 → T013 (independente de US1/US2; usa o seletor global do T007)
- **US4 (P4)**: T007 → T014 → T015; T016 reusa o padrão de gráfico fixado em T014
- **US5 (P5)**: T014 antes de T016 (padrão BarrChart compartilhado), senão independente

### Parallel Opportunities

- Phase 2: T002 + T003 + T006 em paralelo
- Cross-story: após T007, US2..US5 não tocam arquivos de US1 (arquivos distintos) — o pipeline único mantém a ordem de prioridade, mas tasks de stories diferentes podem ser preparadas em paralelo sem conflito (arquivos separados por card)

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 + Phase 2 completas (fundação + page shell)
2. Phase 3: HeatmapCard real sobre a API real
3. **STOP + VALIDATE**: quickstart US1 + regressão do mapa SPE-03
4. Demo: dashboard com o card de mapa funcionando

### Incremental Delivery

- Cada story adiciona um card sem quebrar os anteriores — checkpoints de build/lint por task encerram o gate da Constraint 6
- Após US5, polish (T018–T021) fecha a feature antes do `/speckit-analyze`→implement review

## Notes

- [P] tasks = arquivos distintos, sem dependência nas tasks incompletas vizinhas
- [Story] label mapeia para as user stories do spec.md (traceabilidade FR)
- Nenhuma task de mock: os 5 endpoints existem no Swagger real — qualquer ausência é erro de card, nunca mock no frontend (Princípio I)
- Commit por task ou grupo lógico; parar nos checkpoints para validar a story independentemente
