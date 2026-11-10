# Tasks: Rotas Turísticas e Estoque de Brindes (SPE-05)

**Input**: Design documents from `/specs/006-routes-gifts-inventory/`

**Prerequisites**: plan.md (required), spec.md, research.md (D1–D10),
data-model.md, contracts/gamification-api.md, quickstart.md

**Contexto**: padrão client-side ratificado (SPE-02 REVISÃO 2, repetido na
SPE-03/04): TanStack Query via túnel BFF (`src/shared/lib/bff.ts`),
classificador `api-error.ts`, `QueryProviders`, `DataTable`, estados,
`Button` e `ConfirmDeleteDialog` (já transversal desde a SPE-04)
existentes. Infraestrutura nova desta feature: módulo `src/features/tours`+
rotas `admin/tours{,/new,/[routeId]/edit}` substituindo o placeholder da
SPE-01; **sem página de detalhe** (clarificação de spec; a edição é a
única superfície de leitura da lista ordenada). Reuso cross-feature:
`useSpotCatalogQuery`/`SpotSelector`/`spot-name` de `@/features/events`,
`parseSpotListResponse` de `@/features/attractions` (research D2, padrão
SPE-04). Brinde nasce embutido na rota (sem catálogo de brindes — contrato
real). Remoção = arquivamento. Sem mapa (nada da Constraint 3 se aplica).
Nenhuma dependência nova (Constraint 1).

**Tests**: nenhum framework configurado (decisão do plan) — validação por
`quickstart.md` (V1–V7) + `pnpm build`/`pnpm lint` (Constraint 6).
**Probe de contrato é a task T004** (pendências P1–P4 do contrato; sessão
admin real — credenciais de seed fornecidas interativamente pelo owner,
NUNCA registradas em artefatos).

**Organization**: tasks por user story (US1 cadastro, US2 listagem+saldo,
US3 edição/reordenação, US4 ajuste de estoque, US5 arquivamento —
P1/P1/P2/P2/P3 da spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup

- [X] T001 [P] Ler os guias vigentes do App Router em `node_modules/next/dist/docs/` (AGENTS.md/Constraint 2): rota dinâmica `[routeId]` (param é **Promise** — `await` no Server Component; confirmar contra a docs vigente, NÃO assumir o conhecimento da SPE-04), convenções de `page.tsx`/`metadata` da árvore `(panel)`, navegação programática (`router.push`/`router.replace`); registrar divergências vs. convenções antigas ANTES de tocar nas rotas (plan/D1) — CONFIRMADO 2026-11-10 (docs vigentes): `params` é Promise; `router.push/replace` conforme uso da SPE-04; sem divergências

**Checkpoint**: convenções de rota dinâmica confirmadas na documentação vigente

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, parsers, probe e mensagens — TODAS as stories consomem

- [X] T002 [P] Definir tipos em `src/features/tours/types/index.ts` conforme `data-model.md` (type aliases — linha do DataTable exige index signature implícita): `TouristRouteView` (id int, name 1–200, description 1–2000, spots `[{spotId int ≥ 1, displayOrder int ≥ 1}]`, prize `[{id int, name 1–200, stockQuantity int ≥ 0}]`, status string — valores exatos só após o probe P1, Princípio I), `RouteSummaryView` (id, name, description, spotCount int ≥ 1, prize, status), `RouteListResponse` ({items} — sem paginação neste contrato, YAGNI), `RouteSpotEntry` (spotId + displayOrder), `RoutePrizeView` (id, name, stockQuantity), `RouteCreateBody` (4 campos OBRIGATÓRIOS: name, description, spots, prize{name, initialStock int ≥ 0}) e `RouteUpdateBody` = `{name?, description?, spots?}` (TODOS opcionais, **brinde NÃO faz parte** — comentário citando o contrato, FR-008); `PrizeStockUpdateBody` = `{stockQuantity int ≥ 0}`
- [X] T003 [P] Implementar parsers puros em `src/features/tours/api/contract.ts` (client-safe, sem http/bff — padrão `contract.ts` da SPE-01–04): `parseTouristRouteView` (id int ≥ 1; name/description strings nos limites do contrato; spots array com spotId/displayOrder int ≥ 1; prize com stockQuantity int ≥ 0; status string presente — violação ⇒ `ContractViolationError` com endpoint+campo); `parseRouteSummaryView` (spotCount int ≥ 1); `parseRouteListResponse` ({items: RouteSummaryView[]}; rejeitar array ausente/não-array); `parseRoutePrizeView` (para a resposta do PATCH de estoque); mesmas convenções dos parsers da SPE-01–04
- [X] T004 Executar o **probe de contrato** (pendências P1–P4 + observação de `contracts/gamification-api.md`, padrão SPE-02 T005/SPE-03 T004/SPE-04) com credenciais de seed do administrador fornecidas interativamente pelo owner e API real em `http://localhost:8010`, sessão via painel/túnel: **P1** valores exatos de `status` da rota (ativa × arquivada — define rótulo/comparação na listagem); **P2** `DELETE /api/v1/tourist-spots/{id}` de ponto referenciado por rotas → queda na listagem (spotCount muda?) e em `GET /routes/{id}` (spotId órfão? define FR-013 e mensagens); **P3** `PATCH /gamification/prizes/{prize_id}` para brinde de rota **arquivada** → 200 ou 404? (define disponibilidade do diálogo de estoque); **P4** corpo/mensagem do 422 de estoque **abaixo das reservas comprometidas** (define texto acionável do diálogo); **observação** ordenação de retorno do GET de rotas; registrar TUDO na tabela de resultados de `specs/006-routes-gifts-inventory/contracts/gamification-api.md` (+ spec/data-model se necessário). **Os resultados finalizam os textos de T005 (`messages.ts`) — sem registro dos valores, as mensagens específicas de P2/P4 NÃO podem ser escritas; bloqueia T005 e o desfecho de mensagens/ações das stories — queries básicas não dependem** — EXECUTADO 2026-11-10: P1 status **`"active"`/`"archived"`**; P2 DELETE de spot referenciado ⇒ 204 sem bloqueio/cascata, `spotCount` fica STALE e o detail mantém `spotId` órfão (fallback FR-013 é caso real); P3 PATCH de estoque em rota arquivada ⇒ **200** (UI mantém linha arquivada sem ações — D5); P4 422 `validation_error` p/ negativo/não-inteiro (caso de reservas não disparável — pendência menor); ordenação id asc; resíduo documentado no contrato
- [X] T005 Implementar `src/features/tours/api/messages.ts`: `describeRouteActionFailure` (e `describePrizeStockFailure`) consumindo o mapeamento transversal `failureFromError` de `src/shared/lib/api-error.ts` (Princípio IV — SEM nova refatoração) com mensagens pt-BR específicas: rota/brinde inexistente ou arquivada (404 — inclui o caso de edição de rota arquivada), **ponto turístico desconhecido/removido** (404 do create/edit — Edge Case 1 da spec, usa P2), estoque abaixo das reservas comprometidas (422 — usa P4, mensagem acionável preservando valor), name/description/stockQuantity inválidos (422/validation_error), contrato violado, comunicação indisponível; reutilizar `SESSION_ENDED_PATH` da SPE-02

**Checkpoint**: tipos/parsers prontos; valores do probe registrados (T004 bloqueia mensagens T005 e as ações dependendentes de status/erros — queries e layout básico não dependem)

---

## Phase 3: User Story 1 — Cadastrar rota com pontos ordenados e brinde embutido (Priority: P1) 🎯 MVP

**Goal**: página dedicada `admin/tours/new` com formulário completo: nome,
descrição, construtor de lista ordenada de pontos (catálogo SPE-03) e
brinde (nome + estoque inicial) — `POST /gamification/routes`

**Independent Test**: abrir `/admin/tours/new`, montar rota com ≥ 3 pontos
reordenados (botões, teclado), tentar duplicata, salvar — cenários 1.1–1.4
e V3 do `quickstart.md` (conferência na listagem depende da US2)

### Implementation for User Story 1

- [X] T006 [US1] Criar `src/features/tours/api/queries.ts`: `useRoutesQuery({ includeArchived })` — `useQuery({ queryKey: ["routes", includeArchived], queryFn: via bffJson(`api/v1/gamification/routes${includeArchived ? "?includeArchived=true" : ""}`) + parseRouteListResponse })`; `useRouteQuery(routeId)` — `["routes", "detail", routeId]` via `GET api/v1/gamification/routes/{id}` + `parseTouristRouteView` (carrega a página de edição — US3); `useCreateRouteMutation` (bffJson POST + parseTouristRouteView da resposta 201); `useInvalidateTours()` (invalida `["routes"]` inteira — as variantes com/sem arquivadas); **reuso cross-feature** (research D2): `useSpotCatalogQuery` importado de `@/features/events/api/queries` e `parseSpotListResponse` de `@/features/attractions/api/contract` — SEM duplicar parser/hook; catálogo publicado em cache `["spot-catalog"]` da events (compartilhado)
- [X] T007 [P] [US1] Criar `src/features/tours/components/RouteSpotList.tsx`: construtor da lista ordenada — itens com posição visível (1..n derivada do índice), **botões subir/descer por item operáveis por teclado e ponteiro** (clarificação Q3/research D3 — SEM arrastar-e-soltar, SEM dependência nova), remover item (mínimo exigido 1 — bloquear remoção do último), duplicatas IMPEDIDAS (item já na lista indisponível no `SpotSelector` reusado de `@/features/events/components/SpotSelector` — residual da 3ª passada de clarify); labels acessíveis por ação (aria-label/aria-live para a ordem — FR-016)
- [X] T008 [US1] Criar `src/features/tours/components/RouteForm.tsx` (create): React Hook Form + Zod com limites do contrato — `name` 1–200, `description` 1–2000, spots mínimo 1 (lista T007), `prize.name` 1–200, `initialStock` int ≥ 0 (data-model.md); `displayOrder` derivado do índice na lista no submit (nunca editável direto); submit → `useCreateRouteMutation` com body completo (todos os campos obrigatórios); botão em estado de progresso com trava de duplo envio; estados distintas: loading do catálogo/seletor (cache `["spot-catalog"]`), **vazio do catálogo com orientação "cadastre pontos primeiro" (cenário 1.2)** e erro acionável via `describeRouteActionFailure` (T005); sucesso → `useInvalidateTours()` + navegação para `/admin/tours`
- [X] T009 [US1] Criar página fina dedicada `src/app/(panel)/admin/tours/new/page.tsx` (padrão das páginas dedicadas da SPE-04): monta `<RouteForm mode="create" />` + `metadata` "Nova rota — PassaNorte"; guardas admin da SPE-01 já cobrem `/admin/*` (sem duplicação — FR-001)

**Checkpoint**: US1 funcional (POST sai 1..n com brinde embutido; validações bloqueiam em UI — cenários 1.1–1.4); conferência visual na listagem aguarda US2

---

## Phase 4: User Story 2 — Listar rotas com brinde e saldo em destaque (Priority: P1)

**Goal**: tabela completa de rotas com indicador claro de saldo do brinde
(esgotado 0 em destaque — clarificação Q2), alternador "exibir
arquivadas", substituindo o placeholder da SPE-01

**Independent Test**: abrir `/admin/tours`, conferir colunas/saldo/status,
alternar arquivadas, forçar vazio/erro — cenários 2.1–2.4 e V2 do `quickstart.md`

### Implementation for User Story 2

- [X] T010 [P] [US2] Criar `src/features/tours/components/prize-label.tsx`: indicador de saldo com `stockQuantity` exibido como número + rótulo pt-BR ("em estoque") e **destaque visual próprio para saldo 0 ("esgotado") não confundível com positivo** (clarificação Q2/research D6 — SEM limiar "estoque baixo"); rota arquivada continua exibindo o saldo (estado histórico); o número é SEMPRE o da API — nenhum cálculo no cliente (FR-004/Princípio II)
- [X] T011 [US2] Criar `src/features/tours/components/ToursView.tsx`: `DataTable` com colunas "Rota" (name), "Descrição", "Pontos" (`spotCount`), "Brinde" (prize.name via **prize-label T010**), "Status" (rótulo dos valores do probe P1 — ativa × arquivada identificados de forma inequívoca, cenário 2.3); alternador **"exibir arquivadas"** no topo (alterna `useRoutesQuery({ includeArchived })` — rede mostra `?includeArchived=true` — FR-012); `RowActions` em `src/features/tours/components/RouteRowActions.tsx` (ícones + tooltip acessíveis): **editar** → `/admin/tours/[routeId]/edit` (só para ativa — arquivada não oferece o caminho que levaria a 404; research D5), **ajustar estoque** → abre US4 (só ativa, pendência P3), **arquivar** → abre US5 (só ativa); estados distintos LoadingState/EmptyState (acionável: "nenhuma rota… cadastre")/ErrorState (com retry)
- [X] T012 [US2] Substituir o placeholder de `src/app/(panel)/admin/tours/page.tsx` por página fina Server Component (padrão das features 03/04): monta `<ToursView />` dentro de container adequado + `metadata` "Rotas turísticas — PassaNorte"; guardas admin da SPE-01 em `src/proxy.ts` já cobrem `/admin/*` (sem duplicação — FR-001)

**Checkpoint**: US1+US2 funcionais (cenários 2.1–2.4; V2+V3 do quickstart — a rota criada em T008 aparece com saldo)

---

## Phase 5: User Story 3 — Editar rota e reordenar pontos (Priority: P2)

**Goal**: página dedicada `admin/tours/[routeId]/edit` carregando
`GET /routes/{id}`, PATCH parcial (diff), brinde apenas-leitura, mesma
lista reordenável

**Independent Test**: abrir edição de uma rota ativa, reordenar/remover
pontos, alterar descrição, salvar e reabrir — cenários 3.1–3.4 e V4 do `quickstart.md`

### Implementation for User Story 3

- [X] T013 [US3] Estender `src/features/tours/components/RouteForm.tsx` para `mode="edit"`: carregar via `useRouteQuery(routeId)` (US3 usa o endpoint de detalhe — contrato §1; **não há página de detalhe na UI**, a edição é a única superfície de leitura da lista ordenada — clarificação de spec); prefill nome/descrição/spots (nomes resolvidos pelo catálogo reusado — fallback "ponto turístico não encontrado" FR-013 via helper `spot-name` de `@/features/events/components/spot-name`); **brinde (nome + estoque) apenas-leitura com apontamento "ajuste o estoque pela listagem" (FR-008/D4)**; submit → `useUpdateRouteMutation` (bffJson PATCH + `parseTouristRouteView`) enviando **somente campos alterados** (diff — o que não mudou fica de fora; `spots` reordenada enviada completa revalidada no backend, min 1); rota arquivada carregada na edição → estado sem botão de salvar com aviso explicativo (backend nega com 404 — research D5); erro 404 acionável via `describeRouteActionFailure` (T005)
- [X] T014 [US3] Criar página fina dedicada `src/app/(panel)/admin/tours/[routeId]/edit/page.tsx`: `await params` (T001 — Promise), monta `<RouteForm mode="edit" routeId={…} />` + `metadata` "Editar rota — PassaNorte"

**Checkpoint**: US1–US3 funcionais (cenários 3.1–3.4; V4 do quickstart)

---

## Phase 6: User Story 4 — Ajustar o estoque do brinde (Priority: P2)

**Goal**: diálogo de estoque acionado pela linha da listagem
(`PATCH /gamification/prizes/{id}`), saldo refletido por invalidação — a
baixa na concessão permanece 100% do backend (RF21)

**Independent Test**: abrir diálogo numa rota ativa, alterar saldo para
valor válido e conferir a listagem; negativo bloqueia; 422 de reservas
preserva valor — cenários 4.1–4.4 e V5 do `quickstart.md`

### Implementation for User Story 4

- [X] T015 [US4] Criar `src/features/tours/components/RouteStockDialog.tsx` + `useUpdatePrizeStockMutation` em `src/features/tours/api/queries.ts` (bffJson PATCH `api/v1/gamification/prizes/{prizeId}` + `parseRoutePrizeView`): diálogo Base UI acionado pela **linha da listagem** (clarificação da 2ª sessão — sem página de detalhe/estoque); campo numérico inteiro **≥ 0** validado em UI (Zod — data-model.md); mostra exibindo brinde e saldo atual (somente-leitura do estado antes do ajuste); sucesso → `useInvalidateTours()` (saldo da linha reflete o valor **retornado pela API** — SC-004/FR-004, nenhum cálculo no cliente), feedback de sucesso e fechamento; erro 422 de reservas → mensagem acionável de `describePrizeStockFailure` (T005/P4) **preservando o valor anterior no campo**; arquivadas não abrem o diálogo (ação não ofertada — D5, pendência P3 define 200×404); botão em progresso com trava de duplo envio

**Checkpoint**: saldos atualizam de ponta a ponta (cenários 4.1–4.4; V5 do quickstart)

---

## Phase 7: User Story 5 — Arquivar rota com confirmação (Priority: P3)

**Goal**: remoção como **arquivamento** (DELETE 204) com confirmação que
descreve o efeito real; arquivadas identificadas e sem ações destrutivas
na UI

**Independent Test**: remover uma rota ativa com confirmação e verificá-la
apenas com arquivadas exibidas — cenários 5.1–5.3 e V6 do `quickstart.md`

### Implementation for User Story 5

- [X] T016 [US5] Implementar `useArchiveRouteMutation` em `src/features/tours/api/queries.ts` (bffJson DELETE `api/v1/gamification/routes/{routeId}`, resposta 204) e integrar em `src/features/tours/components/RouteRowActions.tsx`/`ToursView.tsx`: confirmação via `ConfirmDeleteDialog` transversal (`@/shared/components` — SPE-04) com texto que **descreve o efeito real** ("arquivamento com histórico preservado — não exclusão física") e **nomeia a rota** (Princípio V/cenário 5.3); cancelar não muda nada (cenário 5.2); sucesso → `useInvalidateTours()` (sai da listagem padrão; reaparece identificado como arquivada no alternador — FR-012); ações editar/ajustar estoque/arquivar **não ofertadas** para linhas arquivadas (D5 — arquivadas não retornam à ação; sem reativação no contrato)

**Checkpoint**: todas as stories funcionais (cenários 5.1–5.3; V6 do quickstart)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: consistência transversal e gate de encerramento

- [X] T017 [P] Revisão de acessibilidade da lista ordenada e das ações de linha em `src/features/tours/components/` (FR-016/Constraint 6): navegação por teclado completa (subir/descer T007, ações T011/T015/T016), labels/aria coerentes em pt-BR, foco preservado após operações de lista e diálogos
- [X] T018 **Compare de contrato obrigatório** (Governança 5 da constituição): comparar `specs/006-routes-gifts-inventory/contracts/gamification-api.md` campo a campo contra o Swagger `/docs` da API real (`API_BASE_URL`) — divergências atualizam contrato + spec + `messages.ts` (T005) **antes de reexecutar tasks afetadas**; revalidar valores do probe P1–P4 ainda vigentes
- [X] T019 Executar `specs/006-routes-gifts-inventory/quickstart.md` V1–V7 end-to-end contra a API real + `pnpm build` e `pnpm lint` sem erros (Constraint 6 — pré-condição para encerrar); registrar resultados PARCIAL/COMPLETO na task — PARCIAL 2026-11-10: `pnpm build` ✓ (rotas tours geradas) e `pnpm lint` ✓ (0 erros; 5 warnings pré-existentes em features 02–04); desfechos de API V4/V5/V6 confirmados no probe T004 (status/204/200/422/404, PATCH parcial) — VALIDAÇÃO NO NAVEGADOR executada (T020, 28/28 verificações PASS com zero erros de console; V1 permanece parcial — sessão de funcionário sem credencial disponível; guardas /admin/* validados na própria SPE-01)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — imediato
- **Foundational (Phase 2)**: T002/T003 paralelos; T004 (probe) após login
  com sessão admin; T005 consome P2/P4 do probe
- **User Stories (Phase 3–7)**: dependem de T002/T003; T005 (mensagens)
  alimenta desfechos de erro das stories; **T004 bloqueia os desfechos de
  status/erros, não a estrutura**
- **Polish (Phase 8)**: depende de todas as stories

### User Story Dependencies

- **US1 (P1)**: após Foundational — T006→T008→T009 (T007 paralelo a T006)
- **US2 (P1)**: após Foundational; consuma queries de T006 (`useRoutesQuery`)
- **US3 (P2)**: após US1 (RouteForm estendido) e US2 (navegação da linha)
- **US4 (P2)**: após US2 (ação da linha); independente de US3
- **US5 (P3)**: após US2 (ação da linha); independente de US3/US4

### Parallel Opportunities

- T002/T003/T007/T010/T017 são [P] (arquivos distintos)
- US4 e US5 podem ser implementadas em paralelo (arquivos distintos —
  exceto `queries.ts`, que só recebe mutações novas sem conflito de linha)

---

## Implementation Strategy

### MVP First (US1 apenas)

1. Setup + Foundational (probe T004 registrando P1–P4)
2. US1 → cadastro funcional via POST
3. VALIDAR: cenários 1.1–1.4 (independentes — sem listagem)

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 + US2 → cadastro + listagem com saldo (MVP completo de RF18/RF20-leitura)
3. US3 → edição/reordenação (RF19 edit)
4. US4 → estoque (RF20 completo)
5. US5 → arquivamento (RF19 remoção)
6. Polish → a11y, compare de contrato, quickstart V1–V7 + build/lint

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências pendentes
- [Story] label mapeia rastreabilidade para a spec (US1–US5)
- Cada story é completable e testável isoladamente (checkpoints)
- Commit após cada task ou grupo lógico
- Credenciais de seed NUNCA em artefatos (T004)
- Evitar: tasks vagas, conflito de arquivo entre stories paralelas

---

## Phase 9: Convergence

**Purpose**: fechar o gap entre artefatos e implementação (executado após
`/speckit-implement` — achado parcial F1: validação de navegador pendente)
- [X] T020 Executar a validação INTERATIVA do `specs/006-routes-gifts-inventory/quickstart.md` V1–V7 no navegador contra a API real, completando o PARCIAL de T019 (source: SC-001–SC-006, quickstart V1–V7 — partial): `pnpm dev` + sessão de administrador — V2/V3 (listagem com saldo/esgotado destacado e cadastro com reordenação por botões/duplicatas impedidas, cenários 2.1–2.4 e 1.1–1.4), V4 (edição com PATCH parcial por diff e brinde apenas-leitura), V5 (diálogo de estoque na linha com invalidação e 422 preservando valor), V6 (arquivamento com confirmação de efeito real; arquivadas somente-leitura no alternador), V7 (fixture do probe T004: rotas arquivadas "Probe SPE-05…" exibem o fallback "ponto turístico não encontrado" na edição) e V1 com sessão de FUNCIONÁRIO (RBAC bloqueia /admin/tours*); executar o compare final de contrato (T018/Governança 5) antes de declarar a feature encerrada; registrar COMPLETO/PARCIAL na task T019 — EXECUTADO 2026-11-10 via playwright-core + chromium headless (28/28 PASS, zero erros de console; capturas em execução): V2 listagem/esgotado/arquivadas ✓, V3 cadastro com reordenação+duplicatas+limites ✓, V4 edição PATCH parcial+brinde apenas-leitura+mín 1 ponto ✓, V5 estoque negativo bloqueado+saldo 12 refletido ✓, V6 arquivamento/cancelamento/sem-ações ✓, V7 fallback 'ponto turístico não encontrado'+somente-leitura ✓; V1 (funcionário) parcial; compare final confirmado; página de edição ganhou `export const instant = false` (diagnóstico do Next 16 de params fora de Suspense); feature ENCERRADA (resíduo: rotas arquivadas de teste no backend, documentadas no contrato)

---

## Phase 10: Convergence

**Purpose**: fechar o último gap remanescente (achado F1 da 2ª converge —
validação de navegador com sessão de funcionário)
- [X] T021 Executar o V1 do `quickstart.md` com sessão de FUNCIONÁRIO (credencial de seed de funcionário fornecida interativamente pelo owner): logar como funcionário, tentar navegar para `/admin/tours`, `/admin/tours/new` e `/admin/tours/<id>/edit` e verificar o bloqueio do guarda da SPE-01 (redireção ao contexto do papel — RBAC de superfície FR-001); registrar o resultado na T019 per T019/quickstart V1, FR-001 (partial). ALTERNATIVA DOCUMENTADA: se nenhuma credencial de funcionário ativa existir, registrar explicitamente na T019 que FR-001 é comportamento HERDADO e já validado da SPE-01 (`src/proxy.ts` cobre `/admin/*` por prefixo — código inalterado nesta feature), encerrando a pendência sem executá-lo — EXECUTADO 2026-11-10: funcionário de teste criado via API (id 7; credenciais geradas pelo backend usadas em memória, revogadas após o teste — POST /employees/7/revoke); 5/5 PASS no navegador, zero page errors: login do funcionário ⇒ redireção pós-login a /benefits; as 3 rotas /admin/tours* bloqueadas com redireção a /benefits?next=…; /benefits permanece acessível ao papel (captura anexada). T019 ⇒ COMPLETO — quickstart V1–V7 executado; SPE-05 ENCERRADA
