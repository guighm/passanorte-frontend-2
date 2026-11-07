# Tasks: Gerenciamento de Funcionários (SPE-02) — RODADA 2 (REVISÃO 2)

**Input**: Design documents from `/specs/003-employee-management/`

**Prerequisites**: plan.md (required, REVISÃO 2), spec.md, research.md
(D10/D11), data-model.md, contracts/employees-api.md, quickstart.md (REVISÃO 2)

**Contexto da rodada**: a rodada 1 (25/27 tasks) foi implementada
com Server Functions + `revalidatePath` (research D2) e está CONCLUÍDA —
exceto T005 (probe, aguarda credenciais) e T026 (quickstart). Esta rodada
aplica a REVISÃO 2 (research D10/D11): camada de dados **client-side com
TanStack Query** (`useQuery`/`useMutation` via túnel BFF) e ícones
**lucide-react**. Tasks da rodada 2 SUBSTITUEM as server-side: o código de
`features/employees/actions` e a parte server de `api/index.ts` é removido
no fim. Types, `DataTable`, parsers (movidos puros), badge, diálogos e
ordenação permanecem.

**Tests**: nenhum framework de teste configurado (decisão do plan) —
validação por `quickstart.md` + `pnpm build`/`pnpm lint` (Constraint 6).

**Organization**: tasks por user story (US1 listagem, US2 cadastro,
US3 edição, US4 revogação/reativação — P1/P1/P2/P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: fixar convenções das bibliotecas antes do rewire

- [x] T001 [P] Ler a API real do TanStack Query 5 instalado (`node_modules/@tanstack/react-query/dist/` + README — Constraint 2): assinaturas vigentes de `useQuery`/`useMutation`/`QueryClientProvider`/`invalidateQueries` e flags (`isPending` vs `isLoading`, `isError`) — registrar divergências de API antes de escrever código; conferir convenção de provider (QueryClient em estado local do componente provider, nunca em escopo de módulo) e leitura do padrão de ícones lucide-react (import por ícone, tree-shaking)

**Checkpoint**: convenções confirmadas

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: camada transversal client-side que TODAS as stories consomem

**⚠️ CRITICAL**: nenhuma story começa antes deste phase

- [x] T002 Extraí os parsers puros do contrato para `src/features/employees/api/contract.ts` (client-safe, sem import de `http.ts`): mover `parseEmployeeView`/`parseEmployeeList`/`parseEmployeeCreated` de `src/features/employees/api/index.ts` SEM alterar regras (D3 — campo ausente/tipo inesperado ⇒ `ContractViolationError` com endpoint+campo; `initialPassword` obrigatório e não-vazio na 201; violação ⇒ classe de `src/features/auth/api/errors.ts`, client-safe)
- [x] T003 Criar `src/shared/components/QueryProviders/index.tsx` (transversal, Princípio IV — o provider é consumível por SPE-03..07): componente `"use client"` com `QueryClient` em `useState` (estado local do provider — nunca escopo de módulo), defaultOptions; montá-lo em `src/app/(panel)/layout.tsx` envolvendo o shell (client boundary correta: provider ao redor de `{children}`, sem afetar PanelShell server-side)
- [x] T004 Criar o classificador puro compartilhado `src/shared/lib/api-error.ts` (transversal, Princípio IV — consumo por `http.ts` e `bff.ts`, SEM duplicação): função pura que recebe (status, corpo JSON) e devolve a classe de erro — corpo `ApiError { errorCode, message, details }` ⇒ `ApiRequestError`; `HTTPValidationError` (422, `detail: [...]`) ⇒ `errorCode "validation_error"`; sem corpo JSON/conteúdo inesperado ⇒ `ApiUnavailableError` (401/403 são de responsabilidade do caller, que já os classificam antes — ver fluxo de `http.ts`). Refactorar `src/shared/lib/http.ts` (`throwApiErrorResponse` passa a delegar ao módulo puro — semântica PRESERVADA). Em sequência, criar `src/shared/lib/bff.ts` (client-safe — REVISÃO 2/D10): `bffJson(path, init)` e `bffFetch(path, init)` que chamam EXCLUSIVAMENTE o túnel BFF `${"/api/proxy/"}${path}` (ex.: `/api/proxy/api/v1/employees`; strings de query preservadas), classificam não-ok VIA O MESMO módulo `api-error.ts`; 401 após falha de renovação do túnel ⇒ `SessionEndedError`; 403 ⇒ `AuthorizationDeniedError` — nenhuma `fetch` à API fora de `src/shared/lib` (Constraint 5; o túnel apenas transporta payload, nunca interpreta)
- [x] T005 Executar o **probe de contrato** (pendência da rodada 1, research D8) — **EXECUTADO em 2026-11-06**: `"revoked"`, re-revogação 204 idempotente, 409 `conflict`, 404 `resource_not_found`, timestamps ISO-Z (valores em contracts/employees-api.md). Original: com credenciais de seed do administrador fornecidas interativamente pelo owner (NUNCA em artefatos) e API real em `http://localhost:8010` — (1) criar funcionário de teste e registrar formato real de `createdAt`/`updatedAt`; (2) duplicar username e registrar `errorCode` do `ApiError`; (3) revogar e registrar o valor exato de `status`; (4) re-enviar revoke sobre o mesmo id (204 idempotente ou erro); (5) consultar id inexistente (404/`errorCode`); registrar na tabela de pendências de `specs/003-employee-management/contracts/employees-api.md`, no enum do `data-model.md` e na `spec.md` (seção Contrato da API); o funcionário de teste permanece revogado (sem exclusão física — FR-013)

**Checkpoint**: provider, cliente do túnel, parsers client-safe e valores do probe prontos — stories podem começar

---

## Phase 3: User Story 1 — Listagem client-side com cache (Priority: P1) 🎯 MVP

**Goal**: administrador vê a tabela completa com cache (revisitas instantâneas) e estados distintos de carregamento/vazio/erro

**Independent Test**: abrir `/admin/employees` (primeira visita carrega; revisita vem do cache), forçar vazio e erro — cenários 1.1–1.4 do `quickstart.md` (REVISÃO 2)

### Implementation for User Story 1

- [x] T006 [US1] Criar `src/features/employees/api/queries.ts` (client): `useEmployeesQuery()` — `useQuery({ queryKey: ["employees"], queryFn: listar via bffJson("api/v1/employees") + parseEmployeeList })`; e helper local `invalidateEmployees(client)` (`invalidateQueries({ queryKey: ["employees"] })`) para as mutações das US2–US4 (FR-005 via invalidação, D10)
- [x] T007 [US1] Rewire da `src/features/employees/components/EmployeesView.tsx` para o `useEmployeesQuery()`: remover props `employees`/`total`; `isPending/isLoading` ⇒ `LoadingState`; `isError` ⇒ `ErrorState` + "Tentar novamente" (`refetch`) — 401 ⇒ redireção `/login?reason=session-expired` (mapa de `SessionEndedError` no cliente); vazio ⇒ `EmptyState` + CTA "Cadastrar primeiro funcionário"; manter ordenação alfabética estável (`Intl.Collator("pt-BR")`, D7), colunas, badge e total exibido
- [x] T008 [US1] Simplificar `src/app/(panel)/admin/employees/page.tsx` para wrapper fino Server Component que apenas renderiza `EmployeesView` (sem `listEmployees` — a busca é client-side, D10); manter `metadata`; mover o retry interno e REMOVER `src/features/employees/components/EmployeesErrorState.tsx` (estado de erro passa a viver no EmployeesView); REMOVER `src/app/(panel)/admin/employees/loading.tsx` (o `isPending` da query cobre o primeiro load — sem dois estados de loading sobrepostos); REMOVER `src/features/employees/api/index.ts` (parsers extraídos em T002 para `contract.ts`; chamadas inlinadas/`queryFn`+`mutationFn` em `queries.ts` — T009/T011/T013) e REMOVER `src/features/employees/actions/` (Server Functions substituídas pelas mutações — nenhum import restante antes de remover)

**Checkpoint**: US1 funcional com cache (cenários 1.1–1.4)

---

## Phase 4: User Story 2 — Cadastro com credencial única (Priority: P1)

**Goal**: administrador cadastra (só nome + username); credencial exibida UMA única vez, nunca no cache

**Independent Test**: cadastrar válido → diálogo único com aviso; verificar devtools que a 201 com `initialPassword` NÃO está em nenhum cache do QueryClient (cenários 2.1–2.6, SC-002)

### Implementation for User Story 2

- [x] T009 [US2] Adicionar `useCreateEmployeeMutation()` em `src/features/employees/api/queries.ts`: `useMutation({ mutationFn: (body) => createEmployee via bffJson POST "api/v1/employees" com APENAS { name, username } — "no password field by design (system-generated)", sem campo de papel (FR-002/FR-006) + parseEmployeeCreated })`; em sucesso `invalidateEmployees` e retornar a credencial — **resposta de criação NUNCA entra no cache do QueryClient** (Princípio III/D10; o valor flui do `onSuccess`/`mutateAsync` ao diálogo e morre com ele); erros ⇒ `EmployeeActionFailure` via `describeActionFailure` (messages.ts client-safe)
- [x] T010 [US2] Rewire do modo `create` do `EmployeeFormDialog` em `src/features/employees/components/EmployeeFormDialog.tsx`: substituir `createEmployeeAction` (Server Function) pela mutação (`mutateAsync`), `isPending` para botão "Cadastrar", erros acionáveis no diálogo preservando dados digitados (US2.5); fluxo `onCreated(credencial)` → `OneTimeCredentialDialog` INALTERADO (FR-008/D5)

**Checkpoint**: US1+US2 com cache e mutações (cenários 2.1–2.6)

---

## Phase 5: User Story 3 — Edição cadastral (Priority: P2)

**Goal**: editar nome/username com PATCH parcial e aviso de reemissão de credencial

**Independent Test**: editar apenas nome → PATCH de campo único refletido via invalidação; editar username → aviso aparece; inválido → erro no diálogo sem alterar listagem (cenários 3.1–3.4)

### Implementation for User Story 3

- [x] T011 [US3] Adicionar `useUpdateEmployeeMutation()` em `src/features/employees/api/queries.ts`: `PATCH "api/v1/employees/{id}"` com corpo **parcial — SOMENTE campos alterados** (`name` 1–200 e/ou `username` 3–100; nunca `status`); `parseEmployeeView` + `invalidateEmployees`; erros ⇒ `EmployeeActionFailure`
- [x] T012 [US3] Rewire do modo `edit` do `EmployeeFormDialog`: substituir `updateEmployeeAction` pela mutação (envio parcial real — apenas campos alterados), `isPending` em "Salvar", e **manter o aviso de reemissão de credencial quando o username mudar** (linha sob o campo: o funcionário passará a autenticar com o novo valor — clarificação 2026-11-06, FR-009); erro preserva dados (US3.3)

**Checkpoint**: US1–US3 funcionais (cenários 3.1–3.4)

---

## Phase 6: User Story 4 — Revogação e reativação (Priority: P2)

**Goal**: revogar/reativar com confirmação explícita (nunca em um clique), refletidas via invalidação

**Independent Test**: revogar com confirmação → badge muda via invalidação; cancelar → nada; reativar revogado → ativo (cenários 4.1–4.5)

### Implementation for User Story 4

- [x] T013 [US4] Adicionar `useRevokeEmployeeMutation()` e `useReactivateEmployeeMutation()` em `src/features/employees/api/queries.ts`: revoke = `POST "api/v1/employees/{id}/revoke"` via `bffFetch` (204 sem corpo — a "remoção" do RF05 é revogação, FR-013; re-revogação conforme probe T005); reativação = `PATCH` com `{ "status": "active" }` (única constante aceita — "reactivation only via status=active"); ambas com `invalidateEmployees`
- [x] T014 [US4] Rewire dos diálogos `ConfirmRevocationDialog`/`ConfirmReactivationDialog` em `src/features/employees/components/` (via `EmployeesView`): substituir `revokeEmployeeAction`/`reactivateEmployeeAction` pelas mutações; diálogo NOMEIA funcionário + efeito, cancelar NÃO envia nada (US4.2/FR-010/FR-012), erro visível no diálogo e status permanece até confirmação do backend (US4.5)

**Checkpoint**: todas as stories funcionais (cenários 4.1–4.5)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: ícones, auditorias e fechamento

- [x] T015 [P] Ícones lucide-react (D11) nas ações: `Plus` (Novo funcionário em `src/features/employees/components/EmployeesView.tsx`), `Copy`/`Check` (credencial em `OneTimeCredentialDialog.tsx`), `Pencil`/`UserX`/`UserCheck` (em `RowActions.tsx`) — import por ícone, cores via `currentColor`/tokens; ícone COMPLEMENTA o rótulo pt-BR, nunca o substitui (FR-016/a11y)
- [x] T016 Auditoria de credencial única no desenho novo (SC-002/D10) em `src/features/employees/`: confirmar que a resposta 201 (com `initialPassword`) não está em nenhum cache/query/estado persistente — mutação não cacheada, sem `console.*`, sem `localStorage`/`sessionStorage`, sem eco em relatórios de erro; verificar no devtools (network + React Query DevTools, se configurado)
- [x] T017 [P] Acessibilidade pós-rewire (FR-016, Constraint 6): foco/ciclo nos diálogos Base UI, labels de formulário, `role="status"`/`"alert"` nos estados da query, navegação por teclado; textos pt-BR
- [x] T018 Comparar de contrato campo a campo (governança 5 da constituição): implementado (`bffJson`/`bffFetch`/parsers/mutações) vs `specs/003-employee-management/contracts/employees-api.md` — rotas, payloads, 201/200/204/422/404, `errorCode` do probe; divergências atualizam spec + contrato ANTES de reexecutar tasks afetadas
- [ ] T019 Executar a validação completa do `quickstart.md` (REVISÃO 2): probe + cenários 1.1–4.5 incl. cache (revisita instantânea; invalidação refletindo estado da API) + R.1–R.2 (RBAC), confirmando SC-001…SC-006
- [x] T020 `pnpm build` e `pnpm lint` sem erros (Constraint 6) e revisão final contra os princípios I–V (code review do gate) antes do `/speckit-analyze`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependências
- **Foundational (Phase 2)**: T002 ‖ T003 ‖ T004 paralelos (arquivos distintos); T005 (probe) independe mas **bloqueia valores usados por T007+** (badge/enums) e T013 (re-revogação); Checkpoint exige T002–T004
- **US1 (Phase 3)**: T006 → T007 → T008 (rewire em cadeia; T008 remove os módulos server)
- **US2 (Phase 4)**: T009 → T010 (após T004/T006)
- **US3 (Phase 5)**: T011 → T012 (após T010 — reutiliza o diálogo)
- **US4 (Phase 6)**: T013 → T014 (após T011, mesmos padrões)
- **Polish (Phase 7)**: após as stories desejadas; T016/T017 podem começar junto das stories se arquivos distintos — na prática após T014

### User Story Dependencies

- **US1**: após Foundational — sem dependências de outras stories
- **US2**: após Foundational; integra à listagem (T007) via CTA/dialog (fluxo inalterado)
- **US3**: reutiliza o diálogo da US2 (T010 antes de T012)
- **US4**: mesmo padrão de T011; diálogos independentes

### Parallel Opportunities

- T001 isolada; T002‖T003‖T004 (Foundational); T015‖T016‖T017 no Polish
- Entre stories: T009/T011/T013 (mutações em `queries.ts` são serial neste arquivo — sequencial por conflito de arquivo; os rewire de componentes T010/T012/T014 podem ser paralelos após suas mutações)

---

## Implementation Strategy

### MVP First (US1)

1. Setup + Foundational (T001–T004; T005 com credenciais do owner)
2. US1 → **STOP and VALIDATE** (cache: revisita instantânea; estados distintos)
3. Depois US2 (P1) → US3 → US4 → Polish

### Incremental Delivery

1. Foundational client-side pronto (provider + túnel client + parsers)
2. US1 (cache/estados) → validar
3. US2 (credencial única sem cache) → validar com atenção a SC-002
4. US3 (PATCH parcial + aviso) → validar
5. US4 (revogação/reativação confirmadas) → validar
6. Polish: ícones, auditorias, compare, quickstart, build/lint

## Notes

- [P] tasks = arquivos diferentes, sem dependências
- [Story] label mapeia à user story da spec (rastreabilidade)
- Rodada 1 concluída permanece no histórico do git; o `actions/` e parte server de `api/index.ts` são REMOVIDOS em T008 (nenhum import restante antes)
- Commit após cada task ou grupo lógico
- Parar em qualquer checkpoint para validar a story isoladamente
