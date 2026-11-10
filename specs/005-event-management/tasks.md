# Tasks: Gerenciamento de Eventos (SPE-04)

**Input**: Design documents from `/specs/005-event-management/`

**Prerequisites**: plan.md (required), spec.md, research.md (D1–D8),
data-model.md, contracts/events-api.md, quickstart.md

**Contexto**: padrão client-side ratificado (SPE-02 REVISÃO 2, repetido na
SPE-03): TanStack Query via túnel BFF (`src/shared/lib/bff.ts`),
classificador `api-error.ts` (401/403 já classificados pelo próprio
`bff.ts`), `QueryProviders` montados, `DataTable`, estados e `Button`
transversais existentes. Infraestrutura nova desta feature: módulo
`src/features/events` + rotas dedicadas `admin/events{,/new,/[eventId]/edit}`
(FR-013 — padrão novo no projeto, research D3). Contrato sem `GET
/events/{id}` — edição resolve pela listagem (D2). Sem mapa (nada da
Constraint 3 se aplica). Nenhuma dependência nova (Constraint 1).

**Tests**: nenhum framework configurado (decisão do plan) — validação por
`quickstart.md` (V1–V7) + `pnpm build`/`pnpm lint` (Constraint 6).
**Probe de contrato é a task T004** (pendências 1–5 do contrato;
credenciais de seed do admin fornecidas interativamente pelo owner,
NUNCA registradas em artefatos).

**Organization**: tasks por user story (US1 listagem+filtro por ponto, US2
cadastro, US3 edição, US4 remoção — P1/P1/P2/P2 da spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

- [X] T001 [P] Ler os guias vigentes do App Router em `node_modules/next/dist/docs/` (AGENTS.md/Constraint 2): rota dinâmica `[eventId]` (param é **Promise** — `await` no Server Component), convenções de `page.tsx`/`metadata` da árvore `(panel)`, navegação programática (`router.push`); registrar divergências vs. convenções antigas do framework ANTES de tocar nas rotas (research D3) — CONFIRMADO 2026-11-10: `params` é Promise (`dynamic-routes.md` / `page.md` linha 64-65); `PageProps` global disponível; nada de divergências relevantes para esta feature

**Checkpoint**: convenções de rota dinâmica confirmadas na documentação vigente

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, parsers, probe, mensagens e elevação transversal —
TODAS as stories consomem

- [X] T002 [P] Definir tipos em `src/features/events/types/index.ts` conforme `data-model.md` (type aliases — linha do DataTable exige index signature implícita): `EventView` (id int, spotId int ≥ 1, occurrenceDate date puro `YYYY-MM-DD`, description 1–2000, ticketPrice number ≥ 0 duas casas — ZERO extra: sem status/createdAt/nome embutido, Princípio I), `EventListResponse` ({items} — sem paginação neste contrato), `EventCreateBody` (4 campos obrigatórios) e `EventUpdateBody` = `Partial<EventCreateBody>` (omitted permanece — comentário citando o contrato)
- [X] T003 [P] Implementar parsers puros em `src/features/events/api/contract.ts` (client-safe, sem http/bff — padrão `contract.ts` da SPE-02/03): `parseEventView` (id/spotId int ≥ 1; occurrenceDate batendo `^\d{4}-\d{2}-\d{2}$` — **sem validação de período no cliente, clarificação Q1/Princípio II**; description string 1–2000; ticketPrice number ≥ 0 com no máximo 2 casas — violação ⇒ `ContractViolationError` com endpoint+campo); `parseEventListResponse` ({items: EventView[]}; rejeitar array ausente/nao-array); mesmas convenções dos parsers da SPE-01/03
- [X] T004 Executar o **probe de contrato** (pendências 1–5 de `contracts/events-api.md`, padrão SPE-02 T005/SPE-03 T004) com credenciais de seed do administrador fornecidas interativamente pelo owner e API real em `http://localhost:8010`, sessão via painel/túnel: (1) corpos reais do erro unificado em 401/403/404/409/422 nos 4 endpoints de evento; (2) POST com `ticketPrice` como **string** — confirmar aceitação e registrar o padrão adotado (painel envia number); (3) POST e PATCH com ponto "fechado permanentemente" → registrar `errorCode`/mensagem do 409; (4) `DELETE /api/v1/tourist-spots` de ponto COM eventos pendentes → registrar erro/cascata/órfão (define FR-012); (5) `pageSize` máximo efetivo da listagem de spots e critério de esgotamento; evento de teste pode ser REMOVIDO ao fim (DELETE 204) — sem resíduo; registrar TUDO em `specs/005-event-management/contracts/events-api.md` (+ spec/data-model se necessário). **Bloqueia apenas as tasks de FORMULÁRIO/REMOÇÃO (T011+) — listagem não depende**
- [X] T005 [P] Implementar `src/features/events/api/messages.ts`: `describeEventActionFailure` consumindo o mapeamento transversal `failureFromError` de `src/shared/lib/api-error.ts` (já extraído pela SPE-03 T005 — Princípio IV, SEM nova refactor) com mensagens pt-BR específicas: evento/ponto inexistente ou removido (404), ponto "fechado permanentemente" (409 — usa resultado do probe T004), descrição/preço/data inválidos (422/validation_error), contrato violado, comunicação indisponível; reutilizar `SESSION_ENDED_PATH` da SPE-02
- [X] T006 Elevar `ConfirmDeleteDialog` de `src/features/attractions/components/ConfirmDeleteDialog.tsx` para `src/shared/components/ConfirmDeleteDialog/` generalizado (props: `title`, `description`, labels dos botões — DESACOPLADO de `SpotView`; research D5, Princípio IV): atualizar o import da SPE-03 em `src/features/attractions/components/AttractionsView.tsx` para os novos props mantendo os MESMOS textos pt-BR; `pnpm build`/`pnpm lint` cobrem SPE-03 e SPE-04 no mesmo gate (Constraint 6)

**Checkpoint**: tipos/parsers prontos; diálogo transversal elevado; valores do probe registrados (T004 bloqueia apenas formulário/remoção — listagem não depende do probe)

---

## Phase 3: User Story 1 — Listagem de eventos com filtro por ponto (Priority: P1) 🎯 MVP

**Goal**: tabela completa de eventos com nome do ponto resolvido,
filtro server-side por ponto turístico, estados distintos

**Independent Test**: abrir `/admin/events`, conferir colunas/ordenação,
filtrar por um ponto, limpar filtro, forçar vazio/erro — cenários 1.1–1.5 e V2 do `quickstart.md`

### Implementation for User Story 1

- [X] T007 [US1] Criar `src/features/events/api/queries.ts`: `useEventsQuery({ spotId })` — `useQuery({ queryKey: ["events", spotId ?? null], queryFn: via bffJson(`api/v1/events${spotId ? `?spotId=${spotId}` : ""}`) + parseEventListResponse })` (filtro server-side FR-003/D4 — sem recorte local); `useEventQuery(eventId)` — MESMA base `["events"]`, find pelo id na lista (D2: contrato sem GET detalhe); `useSpotCatalogQuery()` — laço de TODAS as páginas da listagem de spots (`page` incrementando, `pageSize` máximo do probe T004, esgotar por contagem menor que pageSize) usando os parsers/constantes importados de `@/features/attractions` (`parseSpotListResponse`, `SPOT_PAGE_SIZE` — D6, parser NÃO duplicado) e publicando `SpotView[]` completo em cache `["spot-catalog"]`; helper `invalidateEvents()` (invalida `["events"]`)
- [X] T008 [US1] Criar `src/features/events/components/spot-name.ts`: resolver `spotId` → nome do ponto a partir do catálogo completo (`useSpotCatalogQuery`); fallback identificável **"ponto turístico não encontrado"** quando não resolvido — NUNCA id bruto, NUNCA ocultar o evento (FR-012/clarificação Q3)
- [X] T009 [US1] Criar `src/features/events/components/EventsView.tsx`: `DataTable` com colunas "Ponto turístico" (nome resolvido T008), "Data de ocorrência" (pt-BR `Intl.DateTimeFormat`, aceita datas passadas), "Descrição", "Preço do ingresso" (`Intl.NumberFormat` moeda, `0` ⇒ "R$ 0,00" gratuito); filtro de ponto no topo (select alimentado pelo catálogo T007, opção "Todos os pontos", server-side via `useEventsQuery({ spotId })`); estados distintos LoadingState/EmptyState (acionável: "nenhum evento… cadastre")/ErrorState (com retry); `RowActions` da feature events (ícones + tooltip acessíveis: editar → `/admin/events/[id]/edit`, remover → abre US4) em `src/features/events/components/EventRowActions.tsx`
- [X] T010 [US1] Substituir o placeholder de `src/app/(panel)/admin/events/page.tsx` por página fina Server Component (padrão attractions page): monta `<EventsView />` dentro de container adequado + `metadata` "Eventos — PassaNorte"; guardas admin da SPE-01 em `src/proxy.ts` já cobrem `/admin/*` (sem duplicação — FR-001)

**Checkpoint**: US1 funcional e testável isoladamente (cenários 1.1–1.5; V2 do quickstart)

---

## Phase 4: User Story 2 — Cadastro de evento em página dedicada (Priority: P1)

**Goal**: formulário único (ponto/data/descrição/preço) em
`/admin/events/new`, seletor com catálogo COMPLETO, cria via POST

**Independent Test**: abrir `/admin/events/new`, validar campos inválidos
(nenhuma requisição), criar evento válido e vê-lo na listagem — cenários
2.1–2.5 e V3 do `quickstart.md`

### Implementation for User Story 2 (bloqueadas por T004/probe apenas no desfecho de falhas)

- [X] T011 [US2] Definir schema Zod em `src/features/events/types/schemas.ts` (padrão `schemas.ts` da SPE-03): `eventFormSchema` — `spotId` (número inteiro ≥ 1, erro "Selecione o ponto turístico"), `occurrenceDate` (string batendo `^\d{4}-\d{2}-\d{2}$`, **SEM restrição de período — datas passadas permitidas, clarificação Q1/Princípio II**), `description` (string 1–2000, erros pt-BR com contador "restam N caracteres"), `ticketPrice` (número ≥ 0, erro "Preço não pode ser negativo"; valores com MAIS de 2 casas decimais são NORMALIZADOS para 2 casas via `transform` — não bloqueados, conforme edge case da spec; 0 = gratuito)
- [X] T012 [US2] Criar `src/features/events/components/SpotSelector.tsx`: select acessível (label explícito, Base UI padrão do projeto) alimentado por `useSpotCatalogQuery` — **desabilitado enquanto o catálogo NÃO está completo (FR-006: nunca com conjunto parcial)**, estado de carregamento/erro/retry próprios, placeholder "Selecione o ponto turístico", opções = nome do ponto (id como valor interno)
- [X] T013 [US2] Criar `src/features/events/components/EventForm.tsx` (modo `create`): React Hook Form + Zod (T011) + `SpotSelector` (T012) + campo de data (`<input type="date">` com label, datas passadas aceitas), textarea de descrição com contador de caracteres (1–2000), campo de preço numérico (label "Preço do ingresso (R$", orientação "0 = gratuito", valor com >2 casas normalizado para 2 antes do envio — edge case da spec); validação campo a campo ANTES do envio (FR-007/SC-003), botão submit em estado de progresso travando duplo envio (US2 edge); falha (409 ponto fechado/404/contrato) via `describeEventActionFailure` visível ACIMA dos botões com dados preservados (FR-010)
- [X] T014 [US2] Criar mutação `useCreateEventMutation` em `src/features/events/api/queries.ts`: `POST api/v1/events` (envia os 4 campos; `ticketPrice` como number — padrão do probe T004) + `parseEventView` + invalidação `["events"]` (sem estado otimista — padrão SPE-02/03)
- [X] T015 [US2] Criar página dedicada `src/app/(panel)/admin/events/new/page.tsx`: Server Component fino montando `EventForm` modo create + `metadata` própria; sucesso ⇒ navegação para `/admin/events` (listagem reflete o evento via invalidação — SC-002); link/retorno visível à listagem

**Checkpoint**: US1+US2 funcionais (cenários 2.1–2.5; V3 do quickstart)

---

## Phase 5: User Story 3 — Edição de evento em página dedicada (Priority: P2)

**Goal**: `/admin/events/[eventId]/edit` carrega o evento existente e
envia PATCH com SOMENTE os campos alterados (inclusive re-vincular ponto)

**Independent Test**: abrir a rota de edição de um evento seedado, alterar
só a descrição (PATCH com diff verificável na rede), re-vincular ponto,
descartar — cenários 3.1–3.5 e V4 do `quickstart.md`

### Implementation for User Story 3

- [X] T016 [US3] Estender `EventForm` (`src/features/events/components/EventForm.tsx`) para modo `edit`: props recebem o `EventView` carregado; valores iniciais = estado atual; desfechos: estado de carregamento distinto antes de dados; 404 (evento/ponto removido) e 409 (re-vínculo a ponto fechado — mensagens do probe T004) acionáveis preservando dados (FR-010); **PATCH por diff**: compara formulário vs. `EventView` atual e envia SOMENTE os campos alterados como `EventUpdateBody` parcial (D8 — omitted permanece; nada mudou ⇒ submete nada); re-vinculação usa o MESMO `SpotSelector`
- [X] T017 [US3] Criar mutação `useUpdateEventMutation` em `src/features/events/api/queries.ts`: `PATCH api/v1/events/{id}` com body parcial + `parseEventView` + invalidação `["events"]`
- [X] T018 [US3] Criar página dedicada `src/app/(panel)/admin/events/[eventId]/edit/page.tsx`: rota dinâmica conforme T001 (`params` é Promise — await); **validar `eventId` numérico** (não-numérico ⇒ `notFound()`); Server Component fino montando `EventForm` modo edit com o id + `metadata` própria; sucesso ⇒ navegação para `/admin/events`

**Checkpoint**: US1–US3 funcionais (cenários 3.1–3.5; V4 do quickstart)

---

## Phase 6: User Story 4 — Remoção com confirmação (Priority: P2)

**Goal**: ação de remover na listagem abre o diálogo transversal (T006)
identificando o evento; só com confirmação o DELETE sai

**Independent Test**: acionar remover/cancelar (nenhuma requisição),
confirmar (204 e evento sai da listagem), remover em outra sessão e
re-tentar (404 acionável) — cenários 4.1–4.4 e V5/V6 do `quickstart.md`

### Implementation for User Story 4

- [X] T019 [US4] Criar mutação `useDeleteEventMutation` em `src/features/events/api/queries.ts`: `DELETE api/v1/events/{id}` via `bffFetch` (204 sem corpo); **invalidação `["events"]` em `onSuccess` E `onError`** (404/removido reflete o estado real da listagem — padrão da mutação de remoção SPE-03)
- [X] T020 [US4] Conectar a remoção em `src/features/events/components/EventsView.tsx`: `EventRowActions` abre o `ConfirmDeleteDialog` transversal (src/shared/components — T006) com `title`/`description` nomeando o evento: nome do ponto RESOLVIDO (T008, fallback identificável) + data pt-BR + aviso de irreversibilidade; cancelar NÃO envia nada (US4.2/FR-009/Princípio V); erro (404/403/indisponível) visível DENTRO do diálogo via `describeEventActionFailure` (US4.3)

**Checkpoint**: todas as stories funcionais (cenários 4.1–4.4; V5/V6 do quickstart)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: fechamento de contrato e gate final

- [X] T021 [P] Revisar `specs/005-event-management/contracts/events-api.md`: pendências 1–5 marcadas como resolvidas pelo probe T004 (e qualquer divergência de contrato registrada ANTES de reexecutar tasks afetadas — governança §5); conferir que comentários de código citam o contrato onde a semântica é não-óbvia (PATCH parcial, fallback FR-012)
- [X] T022 [P] Auditoria de constituição no código entregue (Princípios I–V, Constraints 1–6): nenhuma `fetch` fora de `shared/lib`, nenhum dado fixado no código (RNF06), nenhuma regra de negócio no cliente (datas passadas permitidas = backend decide), token só server-side, a11y: navegação por teclado em formulário/seletor/diálogo/row actions + labels em todos os campos
- [ ] T023 Executar `specs/005-event-management/quickstart.md` V1–V7 end-to-end contra a API real + `pnpm build` e `pnpm lint` sem erros (Constraint 6 — pré-condição para encerrar) — PARCIAL 2026-11-10: build/lint ✓ (0 erros); desfechos de API V1/V6 confirmados no probe T004 (401/403/404/409/422, 201/200/204, PATCH parcial/vazio); VALIDAÇÃO NO NAVEGADOR (V2–V5, V7) PENDENTE — executar manualmente com `pnpm dev` + login admin

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (T001)**: sem dependências — imediato
- **Phase 2 (T002–T006)**: depende de T001 para as rotas (mas tipos/parsers não); T006 independente dos demais
- **US1 (Phase 3)**: depende de T002/T003 (parsers) e T005 (mensagens)
- **US2 (Phase 4)**: depende de US1 (queries.ts base `["events"]`/catálogo) + T004 (desfecho de falhas do formulário exibe os bodies do probe)
- **US3 (Phase 5)**: depende de US2 (EventForm modo edit reutiliza SpotSelector/Zod/mensagens)
- **US4 (Phase 6)**: depende de US1 (listagem/row actions) + T006 (diálogo transversal)
- **Polish (Phase 7)**: todas as stories

### User Story Dependencies

- **US1 (P1, MVP)**: após Foundational — nenhuma dependência de outras stories
- **US2 (P1)**: reutiliza queries/catálogo de US1; independente de US3/US4
- **US3 (P2)**: extensão natural do formulário de US2 (mesmo componente, outra página)
- **US4 (P2)**: só precisa da listagem de US1 + diálogo elevado em T006 — poderia rodar antes de US2/US3 se preciso (independente)

### Parallel Opportunities

- **Phase 1–2**: T001, T002, T003, T005, T006 são [P] (arquivos distintos) — T004 é sequencial e interativa (owner)
- **US1**: queries/Resolver/DataTable são sequenciais por arquivo compartilhado
- **Entre stories**: US1 → (US4 pode paralelizar com US2, arquivos distintos: EventsView vs EventForm/rotas) → US3 (após US2)
- **Polish**: T021 e T022 em paralelo

---

## Implementation Strategy

### MVP First (US1 apenas)

1. Phase 1 + Phase 2 (T001–T006)
2. Phase 3 (US1) — listagem funcional com filtro e nomes resolvidos
3. **STOP**: validar com quickstart V2 (+V1 RBAC)
4. Demo — o painel já mostra eventos reais da API

### Incremental Delivery

1. Setup + Foundational → fundação pronta
2. US1 → validar V2 → **MVP**
3. US2 (cadastro) → validar V3 → criar eventos de verdade no fluxo
4. US3 (edição) → validar V4 → ciclo completo de gestão
5. US4 (remoção) → validar V5/V6 → CRUD fechado
6. Polish → gate final (T023)

### Parallel Team Strategy

1. Equipe conclui Phase 1+2 juntas (probe T004 à parte — interativa)
2. Depois: Dev A — US1; Dev B — T006+US4 (arquivos distintos); Dev A ou C — US2→US3 em sequência (mesmo arquivo EventForm)

---

## Notes

- [P] tasks = arquivos distintos, sem dependência cruzada
- [Story] mapeia a task para a user story da spec (US1–US4)
- Datas passadas SEMPRE aceitas (clarificação Q1) — qualquer validação de período é violação da decisão
- PATCH por diff (D8) — verificação por rede no V4
- Seletor JAMAIS habilitado com catálogo parcial (FR-006)
- ConfirmDeleteDialog transversal (T006) — manter textos equivalentes na SPE-03
- Commit após cada task ou grupo lógico; parar em qualquer checkpoint para validar a story isoladamente
- Evitar: tasks vagas, conflito de mesmo arquivo entre stories paralelas, dependência cruzada que quebre o teste independente

---

## Phase 8: Convergence

- [X] T024 Distinguir estado de CARGA do catálogo de ponto não-resolvido em `src/features/events/components/EventsView.tsx` per FR-012 (partial): enquanto `catalog.isPending`, a coluna "Ponto turístico" (e o diálogo de remoção, quando aplicável) deve exibir placeholder neutro de carregamento ("Carregando…") — o fallback identificável "ponto turístico não encontrado" é reservado para `spotId` ausente com `catalog.isComplete` (ponto removido/cascata) e NUNCA para estado de carga; revalidar com `pnpm build`/`pnpm lint`
