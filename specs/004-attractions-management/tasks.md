# Tasks: Gerenciamento de Pontos Turísticos (SPE-03)

**Input**: Design documents from `/specs/004-attractions-management/`

**Prerequisites**: plan.md (required), spec.md, research.md (D1–D9),
data-model.md, contracts/spots-api.md, quickstart.md

**Contexto**: padrão client-side ratificado (SPE-02 REVISÃO 2): TanStack
Query via túnel BFF (`src/shared/lib/bff.ts`), classificador
`api-error.ts`, `QueryProviders` já montados, `DataTable`, estados e
Button transversais existentes. Infraestrutura nova desta feature: módulo
`src/features/attractions` + `SpotMapPicker` (única integração de mapa —
Constraint 3, lib `@vis.gl/react-google-maps` instalada, decisão do owner).

**Tests**: nenhum framework configurado (decisão do plan) — validação por
`quickstart.md` + `pnpm build`/`pnpm lint` (Constraint 6). **Probe de
contrato é a task T004** (credenciais de seed do admin, NUNCA em artefatos).

**Organization**: tasks por user story (US1 listagem+filtros+paginação,
US2 cadastro, US3 edição, US4 remoção — P1/P1/P2/P2 da spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

- [x] T001 [P] Ler a API real do `@vis.gl/react-google-maps` 1.10.2 instalado (`node_modules/.pnpm/@vis.gl+react-google-maps@*/node_modules/@vis.gl/react-google-maps/dist/index.d.ts`, Constraint 2): confirmar `APIProvider` (prop `apiKey` obrigatória), `Map` (`onClick` → `MapMouseEvent.detail.latLng`), `Marker`, `useApiIsLoaded`, props de câmera/gesto; registrar qualquer divergência antes de escrever o seletor (D2)

**Checkpoint**: convenções do mapa confirmadas nos tipos reais

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, parsers, catálogo/probe e mensagens — TODAS as stories consomem

- [x] T002 [P] Definir tipos em `src/features/attractions/types/index.ts` conforme `data-model.md` (type aliases — linha do DataTable exige index signature implícita): `SpotView` (id int, name, description, latitude −90…90, longitude −180…180, toleranceRadiusM number|null, status, categories string[], schedule SpotScheduleEntry[], createdAt, updatedAt), `SpotListResponse` (items, total, page, pageSize), `SpotScheduleEntry` (weekday, opensAt, closesAt "HH:MM"), `SpotStatus` = "open" | "temporarilyClosed" | "permanentlyClosed" (constantes `SPOT_STATUS_*`), `CategoryView` (key, label) e request types (`SpotCreateBody` com mínimos ≥1 categoria ≥1 dia; `SpotUpdateBody` parcial)
- [x] T003 [P] Implementar parsers puros em `src/features/attractions/api/contract.ts` (client-safe, sem http/bff — padrão `contract.ts` da SPE-02): `parseSpotView` (id int positivo; name/description strings não-vazias; latitude/longitude na faixa; toleranceRadiusM number>0|null; categories array não-vazio de strings; schedule entradas com `opensAt`/`closesAt` batendo `^\d{2}:\d{2}$` e weekday string não-vazia; createdAt/updatedAt date-time parseáveis; **status DEVE estar no enum fechado — valor desconhecido ⇒ `ContractViolationError`, nunca badge inventado**), `parseSpotListResponse` ({items,total,page,pageSize} — 4 campos obrigatórios); violação sempre com endpoint+campo (D3)
- [ ] T004 Executar o **probe de contrato** (research D5/D7, quickstart "Probe"): com credenciais de seed do administrador fornecidas interativamente pelo owner e API real em `http://localhost:8010` — (1) `GET /api/v1/tourists/interest-categories` + criar spot de teste com uma categoria do catálogo e conferir se a chave sobrevive (**correspondência de chaves — obrigatório antes das tasks de formulário**); (2) registrar formato real de `schedule[].weekday` e dos timestamps; (3) POST com coordenada fora de faixa e horário inválido → registrar se vem `HTTPValidationError` ou `ApiError`+`errorCode`; (4) DELETE de id inexistente → 404/`errorCode`; (5) POST omitindo `status` → registrar o default do backend (o painel envia `open` explícito); registrar TUDO na tabela de pendências de `specs/004-attractions-management/contracts/spots-api.md`, em `data-model.md` e na spec; spot de teste pode ser REMOVIDO ao fim (DELETE 204) — sem resíduo
- [x] T005 [P] Implementar o mapeamento de falhas da feature em `src/features/attractions/api/messages.ts` — com o mapeamento de classes→falha em módulo COMPARTILHADO (remediação I1 do /speckit-analyze, Princípio IV): extrair `failureFromError(error)` para `src/shared/lib/api-error.ts` (ao lado do classificador puro: ApiRequestError/AuthorizationDeniedError/ContractViolationError/ApiUnavailableError/SessionEndedError → `{ kind, status?, errorCode?, message }` com o union `kind` compartilhado) e REFACTORAR `src/features/employees/api/messages.ts` para consumi-lo (sem mudança de comportamento); o `messages.ts` da feature attractions fica só com `describeActionFailure` — mensagens pt-BR específicas (coordenada fora de faixa, horário inválido, ponto inexistente/removido, comunicação, contrato; `SESSION_ENDED_PATH` reutilizado da SPE-02)

**Checkpoint**: tipos/parsers prontos; valores do probe registrados (T004 bloqueia apenas as tasks de FORMULÁRIO — a listagem não depende do probe)

---

## Phase 3: User Story 1 — Listagem com filtros e paginação (Priority: P1) 🎯 MVP

**Goal**: tabela paginada com filtro por status (server-side) e categoria (client-side sobre a página), estados distintos

**Independent Test**: abrir `/admin/attractions`, paginar, filtrar por status e categoria, forçar vazio/erro — cenários 1.1–1.6 do `quickstart.md`

### Implementation for User Story 1

- [x] T006 [US1] Criar `src/features/attractions/api/queries.ts`: `useSpotsQuery({ page, status })` — `useQuery({ queryKey: ["spots", page, status], queryFn: via bffJson("api/v1/tourist-spots?page=&pageSize=&status=") + parseSpotListResponse })` com PAGE_SIZE fixa exibível (default 20); `useSpotCategoriesQuery()` — cache próprio `["spot-categories"]` via `bffJson("api/v1/tourists/interest-categories")` (fonte decidida — clarificação; estados próprios de loading/erro/retry, D5); helper `invalidateSpots()` (invalida `["spots"]` — FR-007)
- [x] T007 [US1] Criar `SpotStatusBadge` em `src/features/attractions/components/SpotStatusBadge.tsx`: badge visualmente distinto para os 3 estados do enum fechado com rótulos pt-BR ("Aberto ao público" → `success`, "Temporariamente fechado" → `warning`, "Fechado permanentemente" → `danger` — tokens de cor/globals.css); valor fora do enum ⇒ `ContractViolationError` lançada pelo parser (nunca badge genérico — D3)
- [x] T008 [US1] Implementar `AttractionsView` em `src/features/attractions/components/AttractionsView.tsx` (client): `DataTable` com colunas Nome, Categorias (rótulos do catálogo), Acesso (`SpotStatusBadge`), Criado em, Atualizado em (formatação pt-BR, datas parseáveis); **controles de paginação** prev/next + info "Página X de Y" derivada de `page/pageSize/total` (FR-006, nunca client-side); **filtro por status** (select com os 3 estados + "Todos") compondo a query refetch com página 1; **filtro por categoria** (select do catálogo; aplicado na exibição sobre a página carregada — FR-004/limitação, preservado ao paginar); estados: `isPending` ⇒ `LoadingState`, `isError` ⇒ `ErrorState` + "Tentar novamente" (`refetch`) com 401⇒login (`SESSION_ENDED_PATH`), vazio ⇒ `EmptyState` + "Cadastrar primeiro ponto" + "Limpar filtros" quando filtro ativo; botão "Novo ponto" no cabeçalho (Plus icon — abriga o diálogo da US2)
- [x] T009 [US1] Simplificar `src/app/(panel)/admin/attractions/page.tsx` para wrapper fino Server Component que renderiza `AttractionsView` (padrão SPE-02 — busca é client-side, D1); manter `metadata`; remover o uso de `PlaceholderSection` (placeholder da SPE-01)

**Checkpoint**: US1 funcional e testável isoladamente (cenários 1.1–1.6)

---

## Phase 4: User Story 2 — Cadastro com mapa, categorias e cronograma (Priority: P1)

**Goal**: cadastro completo — localização no Google Maps (lib instalada), categorias do catálogo, cronograma HH:MM, status/tolerância — refletido na listagem

**Independent Test**: cadastrar ponto completo escolhendo posição no mapa, categorias e cronograma; salvar com falhas de validação e ver erros por campo — cenários 2.1–2.7 do `quickstart.md`

### Implementation for User Story 2

- [x] T010 [US2] Criar `SpotMapPicker` em `src/features/attractions/components/SpotMapPicker.tsx` — **a ÚNICA integração de mapa do painel** (Constraint 3, D2, lib `@vis.gl/react-google-maps`): props `{ latitude, longitude, onChange(lat, lng) }`; `APIProvider apiKey={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` (sempre via env — nunca em código) + `Map` com `onClick` definindo o marcador (`MapMouseEvent.detail.latLng` — confirmar nos tipos, T001) + `Marker` clássico; **centro inicial** (FR-009): localização informada em edição; em cadastro, primeiro ponto da listagem vigente (prop `fallbackCenter`) — senão visão padrão da lib (NADA fixado no código, RNF06); **sem `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`**: renderizar fallback acessível (só campos manuais de lat/lng + aviso discreto), sem crash (SC-004: digitar coordenadas posiciona o marcador e vice-versa)
- [x] T011 [US2] Criar `CategorySelector` em `src/features/attractions/components/CategorySelector.tsx`: lista de checkboxes alimentada por `useSpotCategoriesQuery()` (rótulo pt do catálogo, `key` como valor); estado de carregamento/erro próprios com nova tentativa; **nunca categorias hard-coded** (FR-010/RNF06); ao menos 1 seleção obrigatória (contrato minItems 1)
- [x] T012 [US2] Criar `ScheduleEditor` em `src/features/attractions/components/ScheduleEditor.tsx`: por dia da semana (checkbox + inputs `type="time"` para abertura/fechamento; vocabulário do probe T004 mapeado para `weekday`), com validação de coerência (fechamento após abertura; formato HH:MM do contrato); gera `SpotScheduleEntry[]` (≥1 dia — contrato)
- [x] T013 [P] [US2] Implementar schemas de validação em `src/features/attractions/types/schemas.ts` (Zod espelhando o contrato): nome 1–200, descrição 1–2000, latitude −90…90, longitude −180…180, `toleranceRadiusM` number>0 opcional, `categories` array ≥1, `schedule` ≥1 entrada com `opensAt`/`closesAt` batendo `^\d{2}:\d{2}$` e fechamento>abertura, `status` enum dos 3 valores; schemas create/parcial-update
- [x] T014 [US2] Criar `SpotFormDialog` em `src/features/attractions/components/SpotFormDialog.tsx` (client, RHF+Zod — D6, modo create|edit): campos Nome, Descrição, `CategorySelector`, `SpotMapPicker`, **Raio de tolerância (m) opcional** (clarificação), `ScheduleEditor`, Status (radio/select dos 3, default `open`); valida antes do envio; estados carregamento/erro visíveis e distintos (Princípio V); dados preservados em erro (FR-014)
- [x] T015 [US2] Adicionar `useCreateSpotMutation()` em `src/features/attractions/api/queries.ts` (POST `api/v1/tourist-spots` com `additionalProperties: false` do contrato — apenas campos validados; `parseSpotView`; `invalidateSpots()` em sucesso) e integrar: botão "Novo ponto" (T008) e CTA do vazio abrem `SpotFormDialog` create; após 201 a listagem reflete o ponto (FR-007/SC-001)

**Checkpoint**: US1+US2 funcionais (cenários 2.1–2.7)

---

## Phase 5: User Story 3 — Edição de ponto turístico (Priority: P2)

**Goal**: editar qualquer campo (incl. reposicionar no mapa, cronograma e STATUS — RF15) com PATCH parcial

**Independent Test**: editar nome/categorias/posição/horário/status via diálogo edit; refletido via invalidação; recusas acionáveis — cenários 3.1–3.4

### Implementation for User Story 3

- [x] T016 [US3] Adicionar `useUpdateSpotMutation()` em `src/features/attractions/api/queries.ts` (PATCH `api/v1/tourist-spots/{id}` com **corpo parcial — somente campos alterados**; `schedule` resubmitida inteira quando alterada — D6; `parseSpotView`; `invalidateSpots`) e modo `edit` no `SpotFormDialog` (T014): pré-preencher todos os campos, envio de apenas os alterados (FR-012), alteração de status incluída (RF15), re-locação via `SpotMapPicker` (centro = posição atual); erro preserva dados (US3.3)
- [x] T017 [US3] Criar `RowActions` em `src/features/attractions/components/RowActions.tsx` (client, ícones lucide + Tooltip Base UI com `Portal` — padrão SPE-02): ação "Editar" (Pencil) abre o diálogo em modo edit; incluir slot para a ação de remoção da US4

**Checkpoint**: US1–US3 funcionais (cenários 3.1–3.4)

---

## Phase 6: User Story 4 — Remoção permanente (Priority: P2)

**Goal**: remover ponto com confirmação explícita nomeando ponto+efeito permanente (DELETE 204)

**Independent Test**: remover com confirmação → sai da listagem; cancelar → nada; 404/removido → erro acionável — cenários 4.1–4.3

### Implementation for User Story 4

- [x] T018 [US4] Adicionar `useDeleteSpotMutation()` em `src/features/attractions/api/queries.ts` (DELETE `api/v1/tourist-spots/{id}` via `bffFetch`; 204 ok; 404/`errorCode` do probe T004 ⇒ falha acionável; `invalidateSpots` em sucesso e também após 404 — refletir estado real) e remover o spot da listagem via invalidação (FR-007)
- [x] T019 [US4] Criar `ConfirmDeleteDialog` em `src/features/attractions/components/ConfirmDeleteDialog.tsx` (client, Base UI Dialog): NOMEIA o ponto (nome) e o efeito ("remoção permanente — irreversível", RF12/FR-013); cancelar NÃO envia nada (US4.2); botão `danger`; erro visível no diálogo sem reabrir sozinho (US4.3); conectá-lo ao `RowActions` (Trash2) para pontos da tabela

**Checkpoint**: todas as stories funcionais (cenários 4.1–4.3)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 [P] Ícones lucide-react (D11) e tooltips: `Plus` (Novo ponto — T008), `Pencil`/`Trash2` + tooltips (RowActions — T017/T019), rótulos pt-BR SEMPRE complementam o ícone (FR-016/a11y — `aria-label`)
- [x] T021 [P] Auditoria de portabilidade e contratos (SC-005/FR-002): grep em `src/features/attractions/` — nenhuma categoria/chave/weekday/nome de cidade/centro de mapa/chave de API hard-coded; coordenadas de centro vêm só de props/dados; verificar que o enum `SpotStatus` fechado não aceita badge genérico
- [x] T022 [P] Acessibilidade (FR-016, Constraint 6): foco/ciclo nos diálogos (Base UI), labels de todos os campos (incl. inputs de latitude/longitude manuais e `type="time"`), `role="status"`/`"alert"` nos estados, navegação por teclado em todos os seletors; mapa inoperante ⇒ alternativa manual anunciada
- [x] T023 Comparar de contrato campo a campo (governança 5 da constituição): implementado vs `specs/004-attractions-management/contracts/spots-api.md` — rotas, payloads, `additionalProperties: false`, 201/200/204/422/404, `errorCode`s do probe, vocabulário de `weekday` e default de `status`; divergências atualizam spec+contrato ANTES de reexecutar tasks afetadas
- [ ] T024 Executar a validação completa do `quickstart.md` (probe + cenários 1.1–4.3 + R.1–R.2), confirmando SC-001…SC-006 (mapa: cenários 2.1/2.2/2.6 executados com `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configurada e sem ela)
- [x] T025 `pnpm build` e `pnpm lint` sem erros (Constraint 6) e revisão final contra os princípios I–V da constituição antes do `/speckit-analyze`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependências; antes do SpotMapPicker (T010)
- **Foundational (Phase 2)**: T002‖T003‖T005 paralelos; **T004 (probe) precisa de credenciais do owner e BLOQUEIA apenas as tasks de formulário (T011–T015, T012 etc.); listagem (US1) não depende do probe** (badge usa o enum fechado do contrato)
- **US1**: T006 → T007‖T008 → T009
- **US2**: T010 (mapa) ‖ T011 (catálogo) ‖ T012 (cronograma) ‖ T013 (schemas) → T014 (diálogo) → T015 (mutação+integração); T011 requer T004 confirmado (correspondência de chaves)
- **US3**: T016 após T014 (reutiliza diálogo) + T006; T017 após T008 (linha)
- **US4**: T018 → T019 (após T017 — RowActions)
- **Polish (Phase 7)**: após stories; T024 (quickstart) precisa dev server + API

### Parallel Opportunities

- T002‖T003‖T005 (Foundational); T010‖T011‖T012‖T013 (blocos do formulário, arquivos distintos — T011 após T004); T020‖T021‖T022 (Polish)
- Stories US3/US4 seguem US2 pelo diálogo/RowActions compartilhados

---

## Implementation Strategy

### MVP First (US1)

1. Setup + Foundational (T001–T005; probe T004 com credenciais do owner)
2. US1 completa → **STOP and VALIDATE** (cenários 1.1–1.6)
3. US2 (P1) → US3 → US4 → Polish

### Incremental Delivery

1. Foundational pronto (tipos/parsers/mensagens + probe)
2. US1 (listagem/filtros/paginação) → validar (MVP)
3. US2 (cadastro com mapa/categorias/cronograma) → validar com SC-004 e fallback de mapa
4. US3 (edição parcial + status RF15) → validar
5. US4 (remoção permanente confirmada) → validar
6. Polish: ícones, auditoria RNF06, a11y, compare de contrato, quickstart, build/lint

## Notes

- [P] tasks = arquivos diferentes, sem dependências
- [Story] label mapeia à user story da spec (rastreabilidade)
- Probe (T004) exige credenciais de seed do admin (uso interativo, NUNCA em artefatos) — bloqueia apenas o formulário
- `SpotMapPicker` é a única integração de mapa (Constraint 3): SPE-07 reusa; nenhuma segunda lib de mapa
- Commit após cada task ou grupo lógico
- Parar em qualquer checkpoint para validar a story isoladamente

---

## Phase 8: Convergence (Emenda constitucional 2.0.0 — migração de mapa para OSM)

**Purpose**: aplicar a decisão do owner (2026-11-06) — migração Google Maps → OpenStreetMap com emenda MAJOR 2.0.0 da constituição (custo: Google exige billing pré-paga; RNF15)

- [x] T026 Executar a emenda da constituição (MAJOR 2.0.0): Constraint 3 redefinida (OpenStreetMap via `react-leaflet`+`leaflet`, sem chave/billing; Google removido da Constraint 1 — `@vis.gl/react-google-maps` desinstalada), Sync Impact Report atualizado, cópia `docs/CONSTITUTION.md` sincronizada (`.specify/memory/constitution.md`) per clarificação 2026-11-06 (contradicts — supersedes Constraint 3 rodada 1)
- [x] T026b Instalar dependências sancionadas: `pnpm add react-leaflet leaflet` (5.0.0/1.9.4, React 19 ok) + `-D @types/leaflet`; `pnpm remove @vis.gl/react-google-maps` per plan: emenda 2.0.0 (missing)
- [x] T026c Reescrever `src/features/attractions/components/SpotMapPicker.tsx` com react-leaflet PRESERVANDO a interface de props `{latitude, longitude, fallbackCenter, onChange}` (SPE-07 herda): `MapContainer`+`TileLayer` OSM (attribution legal) + `Marker` do bundle (ícones do pacote, sem CDN) + `useMapEvents({click})` + `Marker draggable/dragend`; sem SSR (render pós-mount com skeleton — Princípio V); visão global padrão quando catálogo vazio per plan: emenda 2.0.0 (missing)
- [x] T026d Atualizar artefatos da SPE-03 para a emenda (spec: nota de escopo/assumptions/clarificação; plan: deps/constituição check/constraints/research D2 superseded + D12; quickstart: cenários de mapa sem chave) per plan: emenda 2.0.0 (partial)

