# Tasks: Fundações e Autenticação do Painel

**Input**: Design documents from `/specs/001-panel-foundation-auth/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Nenhum task de testes automatizados: o repositório não tem
framework de testes configurado (research.md D7 — decisão documentada);
validação pelos cenários de `quickstart.md` + gates `pnpm build`/`pnpm lint`.

**Organization**: Tasks grouped by user story (US1 login, US2 guardas,
US3 sessão, US4 shell) — cada fase é um incremento isoladamente testável.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Aplicação web única (App Router): código em `src/` (feature-based em
`src/features/auth/`, transversais em `src/shared/`, rotas em `src/app/`
— route group `(panel)` com `admin/{dashboard,attractions,events,tours,employees}`
e `benefits`, mais `login/` — constituição v1.2.1),
guarda global em `src/proxy.ts`. A API "Passanorte API" roda em
`http://localhost:8010`; contrato confirmado em `contracts/auth-api.md`
(mocks removidos — T046, 2026-11-06).

**Gates de TODA task** (Constraint 5 da constituição): `pnpm lint` e
`pnpm build` sem erros antes de marcar a task como concluída. Acessibilidade
mínima (teclado, labels) faz parte de pronto (FR-019).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Estrutura de diretórios da fundação e configuração de ambiente

- [X] T001 Create fundação directories `src/features/auth/{api,session,components,guards}`, `src/shared/lib` e `src/app/api/proxy/[...path]` conforme Project Structure de plan.md
- [X] T002 [P] Create `.env.example` documentando `API_BASE_URL` (ausente ⇒ modo mock marcado, research D6) sem chaves sensíveis no código-fonte (Princípio III)
- [X] T003 Run baseline gates `pnpm lint` e `pnpm build` no template atual e registrar resultado de partida

**Checkpoint**: estrutura pronta — camadas transversais podem ser construídas

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos, camada de API, sessão httpOnly, cliente HTTP e guarda
mínimo — pré-requisito de TODAS as user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Define domain types em `src/features/auth/types.ts`: `Operator` (`id`, `username`, `name`, `role`), `Role` = `"administrador" | "funcionário"` (enum fechado — data-model.md), `LoginResponse` (com `access_token`, `refresh_token`, `token_type`, `expires_in`, `user`), `PanelSession`; `role` fora do enum ⇒ tratar como falha de sessão (edge case da spec) — *supersede 2026-11-06 (T039/T040): contrato real é camelCase sem `user` (`SessionResponse`) e `Role` canônico `"admin"|"employee"`; descrição acima registra o baseline vencido de 2026-10-30*
- [X] T005 [P] Define error/result types de contrato em `src/features/auth/api/errors.ts`: `AuthInvalidCredentialsError` (401), `ApiUnavailableError` (5xx/rede), `ContractViolationError` (payload fora do baseline — Princípio I: divergência NUNCA reinterpretada silenciosamente), `AuthorizationDeniedError` (403)
- [X] T006 Implement auth api layer em `src/features/auth/api/index.ts`: `login`, `logout`, `me` conforme `contracts/auth-api.md` (rotas `/api/v1/auth/*`, prefixo `API_BASE_URL` via env, Princípio III); nenhum outro arquivo do app importa a API direto (Princípio I)
- [X] T007 [P] Implement mock fixtures server-side em `src/features/auth/api/mock.ts` para os 4 endpoints `/api/v1/auth/*`, cada módulo marcado `// MOCK (temporary): remove when /auth/* is live` (research D6); fixtures: usuário `admin` (papel `administrador`) e `funcionario` (papel `funcionário`); ativa apenas quando `API_BASE_URL` não definida; expiração curta configurável para o cenário C3 — *supersede 2026-11-06 (T046): mocks e fixtures removidos; task histórica do modo mock*
- [X] T008 Implement session storage server-side em `src/features/auth/session/index.ts`: `getSession`, `setSession`, `clearSession`, `refreshSession` conforme `contracts/panel-session.md` — `cookies()` async (Next 16), cookies httpOnly `SameSite=Lax`, `Secure` em produção, expiração alinhada a `expires_in`; gravação somente em Route Handlers/Server Actions (doc cookies.md, research D2)
- [X] T009 Implement shared HTTP client em `src/shared/lib/http.ts`: `apiFetch` anexando Authorization a partir da sessão server-side (`http.ts` — nunca do cliente), classificação de 401/403/contrato via T005, helpers de estado consumidos pela UI (Princípio V); tratamento de 401/refresh é wired em US3 (T021/T022)
- [X] T010 Implement BFF minimal tunnel `src/app/api/proxy/[...path]/route.ts`: repassa método/corpo/caminho a `API_BASE_URL` anexando sessão server-side; não reinterpreta payloads (research D3)
- [X] T011 Implement minimal route guard em `src/proxy.ts` (convenção `proxy.ts` de Next 16, NÃO `middleware.ts` deprecated — research D1): sem sessão em rota protegida ⇒ redirect `/login`; `/login` é a única rota pública

**Checkpoint**: Foundation ready — US1 pode começar; sessão, http e guardas
disponíveis para US2–US4

---

## Phase 3: User Story 1 — Login do operador (Priority: P1) 🎯 MVP

**Goal**: Operador (admin ou funcionário) autentica contra a API, vê os
estados de UI (FR-003) e é redirecionado por papel (FR-004)

**Independent Test**: C1 de `quickstart.md` — credenciais válidas por papel
chegam à área correta; inválidas dão erro genérico; backend indisponível dá
erro de comunicação

### Implementation for User Story 1

- [X] T012 [US1] Create Login Server Action em `src/features/auth/actions/login.ts`: lê FormData (username, password), chama `login()` (T006), em sucesso grava sessão (`setSession`, T008) e redireciona por papel (administrador→`/`, funcionário→`/benefits`, research D5); NUNCA valida/compara credenciais localmente (FR-002, Princípio II); mapeia erros (T005) para mensagens acionáveis sem revelar detalhes técnicos — *supersede 2026-11-06 (T042): redirect honra `?next=` clampado por `roleCanAccess`; rotas conforme a árvore em inglês do Princípio IV da constituição v1.2.1 (descrições das Phases 3–4 originalmente escritas com nomenclatura PT, unificadas pela Phase 10 — T042/T045)*
- [X] T013 [P] [US1] Create `LoginForm` component em `src/features/auth/components/LoginForm.tsx`: `<form action>` + `useActionState` (padrão do guia authentication.md — research D4), campos com `<label>` acessíveis, estado pending desabilitando envio, mensagem de erro visível e distinta (FR-003, FR-019)
- [X] T014 [US1] Create `/login` page em `src/app/login/page.tsx`: rota pública única (fora do grupo de layout do painel), renderiza `LoginForm`, e com sessão ativa redireciona por papel (não reexibir login); exibe aviso de sessão encerrada quando redirecionada pelo fluxo de expired-session (parâmetro de navegação, consumido por T024)
- [X] T015 [US1] Validate C1 do quickstart.md no modo mock: os 5 passos (login admin → `/`, logout, login funcionário → `/beneficios`, credencial inválida, backend desligado → erro de comunicação) + gates lint/build — **supersede 2026-11-06: modo mock removido (T046)**; critérios reexecutados na rodada real de T047 (matriz automática passou; interações de navegador permanecem em T047)

**Checkpoint**: MVP funcional — login por papel funciona com mocks marcados

---

## Phase 4: User Story 2 — Acesso às áreas por papel (Priority: P1)

**Goal**: Funcionário não alcança seções administrativas por navegação nem
por endereço (FR-010..FR-014, SC-002, SC-005)

**Independent Test**: C2 de `quickstart.md` — com sessão funcionário, rotas `/`, `/admin/*` redirecionam a `/benefits` sem render (reload incluído); admin vê tudo *(rotas conforme Princípio IV — unificação da Phase 10)*

### Implementation for User Story 2

- [X] T016 [US2] Create guard map em `src/features/auth/guards/index.ts`: `roleCanAccess(role, pathPattern)` com mapa `"/"→admin`, `"/admin/*"→admin`, `"/benefits"→admin|employee`, `"/login"` pública (contracts/panel-session.md); valor único de papel retornado pela API — painel NUNCA deduz papel (FR-013, Princípio II) — *rotas/valores conforme a árvore em inglês do Princípio IV (unificação da Phase 10, T042/T045)*
- [X] T017 [US2] Extend `src/proxy.ts` com guardas por papel (T008, T016): rota bloqueada para o papel ⇒ redirect à rota permitida do papel (funcionário→`/benefits`), sem renderizar a página bloqueada; papel válido porém sem valor no mapa ⇒ tratar como sessão inválida (edge case); segunda camada de papel no `(panel)/layout.tsx` server-side (research D1) — *rotas conforme Princípio IV (unificação da Phase 10, T042/T045)*
- [X] T018 [P] [US2] Create route group `(panel)` em `src/app/(panel)/layout.tsx` com shell base: sessão lida server-side (T008), navegação condicional ao papel via guards (T016) — admin vê todos os itens, funcionário apenas o item de benefícios (rota `/benefits`, rótulo de UI "Benefícios") (FR-012); sem item de logout nesta fase (US3) — *rotas conforme Princípio IV (unificação da Phase 10, T042/T045)*
- [X] T019 [P] [US2] Create placeholder pages admin: `src/app/(panel)/page.tsx` (home; T030 a completa) e `src/app/(panel)/admin/{employees,attractions,events,tours,dashboard}/page.tsx` com placeholders estáticos mínimos e mensagem "seção definida na spec correspondente" (FR-017; sem dados da cidade fixados — FR-018) — *rotas conforme Princípio IV (unificação da Phase 10, T042/T045)*
- [X] T020 [P] [US2] Create `/benefits` placeholder em `src/app/(panel)/benefits/page.tsx`: landing do funcionário com placeholder da área de concessão (SPE-06 definir) — *rotas conforme Princípio IV (unificação da Phase 10, T042/T045)*
- [X] T021 [US2] Validate C2 do quickstart.md: guardas por endereço com reload (funcionário bloqueado em `/` e 5 rotas `/admin/*`, admin libera todas; navegação condicional correta) + gates lint/build

**Checkpoint**: RBAC de superfície completo — base do shell navegável

---

## Phase 5: User Story 3 — Ciclo da sessão (Priority: P2)

**Goal**: Renovação transparente no 401, sem loops; logout explícito; sessão
encerrada leva ao login com aviso (FR-006..FR-009)

**Independent Test**: C3 de `quickstart.md` — renovação invisível, uma única
chamada de refresh por ciclo, sem loop, logout esvazia sessão

### Implementation for User Story 3

- [X] T022 [US3] Implement coordinated refresh em `src/features/auth/session/refresh.ts` (estende T008): chamada única em curso por ciclo com mutex in-process (US3 cenário 4), `POST /api/v1/auth/refresh` conforme `contracts/auth-api.md`; falha (401/expirado/recusado) ⇒ `clearSession` + sinal de sessão encerrada (FR-007) — NUNCA retratar renovação indefinidamente
- [X] T023 [US3] Wire 401 flow em `src/shared/lib/http.ts` (estende T009): em 401, uma única renovação via T022 e replay da requisição original com o novo token (US3 cenário 1); renovação falha ⇒ chamadas em curso falham com estado de sessão encerrada (não erro de ação — FR-009)
- [X] T024 [US3] Create logout Server Action em `src/features/auth/actions/logout.ts`: `POST /api/v1/auth/logout` no backend (confirmado) (401 tratado como logout concluído — contracts/auth-api.md), `clearSession` sempre (`contracts/panel-session.md`), depois redireciona ao `/login`; endpoint não existente (404/405) ⇒ logout apenas local com anotação de divergência nos artefatos (contracts/auth-api.md) — *supersede 2026-11-06 (T044): fallback 404/405⇒logout local removido; 404/405 é `ContractViolationError` (contrato confirmado: 204)*
- [X] T025 [P] [US3] Add LogoutButton component em `src/features/auth/components/LogoutButton.tsx`: aciona T024 via `useTransition` (pendente visível), operável por teclado, item do cabeçalho do shell (FR-019)
- [X] T026 [US3] Add aviso de sessão encerrada: quando `refreshSession` (T022) encerra sessão durante uso, redirect ao `/login` com aviso (T014 exibe) — operador ciente de que a ação não será concluída (edge case da spec, sem perda silenciosa)
- [X] T027 [US3] Validate C3 do quickstart.md (supersede 2026-11-06: critérios no modo real em T047 — renovação transparente e rotação validadas por HTTP real; concorrência simultânea em navegador permanece em T047): (1) renovação transparente pós-expiração; (2) refresh falho ⇒ login com aviso, sem loop na aba de rede; (3) duas ações simultâneas ⇒ UMA chamada de refresh; (4) logout limpa sessão e token antigo não autoriza mais + gates lint/build

**Checkpoint**: ciclo completo de sessão conforme RNF09

---

## Phase 6: User Story 4 — Shell de layout e página inicial (Priority: P2)

**Goal**: Moldura transversal com identificação da sessão no cabeçalho e
home com placeholders por seção, estados loading/vazio/erro (FR-016..FR-019)

**Independent Test**: C5 de `quickstart.md` — nav condicional correta por
papel, cabeçalho com nome+papel, placeholders com três estados, teclado

### Implementation for User Story 4

- [X] T028 [US4] Create API status components em `src/shared/components/`: `LoadingState`, `EmptyState`, `ErrorState` (padrão de `Button`/`DataTable` — Princípio IV), reutilizáveis por todas as features; mensagens acionáveis (Princípio V)
- [X] T029 [P] [US4] Add operador ao cabeçalho do `(panel)/layout.tsx` (estende T018): nome+papel vindos da sessão server-side (GET `/auth/me` apenas revalida quando o contrato o confirmar — contracts/auth-api.md); logout já presente via T025 — *supersede 2026-11-06 (T045/T050): `/auth/me` confirmado no contrato; revalidação ligada na restauração da moldura (T050)*
- [X] T030 [US4] Rebuild `/` home em `src/app/(panel)/page.tsx` (estende T019): grid de placeholders por seção do painel (Dashboard e Insights, Pontos Turísticos, Eventos, Rotas e Benefícios, Funcionários) usando T028; placeholders ESTÁTICOS nesta fundação (análise E1: nenhum endpoint de seção existe no contrato — SPE-02..07 integrarão os dados; NENHUM endpoint inventado no frontend, Princípio I); os componentes de estado (T028) ficam prontos para consumo das features seguintes — sem nenhum dado da cidade fixado no código (FR-017, FR-018, Princípio IV)
- [X] T031 [US4] Validate C5 + acessibilidade do quickstart.md (supersede 2026-11-06: crítica de navegação por papel executada por HTTP real em T047; teclado/navegador permanece em T047): navegação condicional por papel, cabeçalho com nome+papel, placeholders estáticos + componentes de estado prontos (T028, FR-017/FR-018), operação só por teclado com labels (FR-019) + gates lint/build

**Checkpoint**: fundação completa — SPE-02..07 consomem `contracts/panel-session.md`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Conformidade com constituição e encerramento do ciclo

- [X] T032 Constitution review do código entregue: Princípios I–V e Constraints 1–5 do plan.md — verificar `grep` por imports da FastAPI fora de `src/features/auth/api` (I), por decisão de autorização no cliente (II), por token acessível a JS/`localStorage` (III), por dados de cidade fixados (IV), por interação com API sem estados (V) e por uso de `middleware.ts` deprecated (Constraint 2)
- [X] T033 [P] Register follow-up de contrato: registrar em `docs/SPECS.md` (Seção 2) que, quando o backend subir, o compare campo a campo de `contracts/auth-api.md` contra o Swagger real é task obrigatória do ciclo — divergências editam spec+contrato ANTES da SPE-01 ser encerrada (Assumptions da spec)
- [X] T034 Run full final: `pnpm lint` + `pnpm build` sem erros e todos os cenários C1–C5 de `quickstart.md` passando; registrar resultado — **supersede 2026-11-06: modo mock removido (T046)**; rodada final real = T047 (lint/build limpos hoje; C1–C5 reais em T047)

---

## Dependencies

```text
Phase 1 (Setup)
  └→ Phase 2 (Foundational) — T001→T004→T005/T007/[P]→T008→T006/T009→T010/T011
        └→ US1 (T012→T013→T014→T015)  [P1 · MVP]
        └→ US2 (T016→T017→T018→T021; T019/T020 paralelos)  [P1 · depende de US1: teste com sessão]
        └→ US3 (T022→T023→T024→T025/T026→T027)  [P2 · depende de US1+US2 (header/cabeçalho e shell)]
        └→ US4 (T028→T029/T030→T031)  [P2 · depende de US2+US3 (shell, logout e estados de sessão)]
              └→ Phase 7 (Polish — T032/T033/T034)
        └→ Phase 8/9 (Convergence 2026-10-30 — T035–T038)
        └→ Phase 10 (Contrato real 2026-11-06) — T039→T040→T041 → T042/T043/T044/T045/T046 [P] → T047
              └→ Phase 11 (Convergence 2026-11-06 — T048/T049 [P] → T050)
                    └→ Phase 12 (Convergence pós-Phase 11 — T051)
```

- US1 requer a fundação (T004–T011).
- US2 reutiliza sessão (T008) e guardas (T011); exige US1 para criar sessões de teste.
- US3 depende de US1+US2 (requer navegação/uso em shell para exercitar 401 e logout).
- US4 depende de US2+US3 (shell base T018, cabeçalho com logout T025).
- Sem ciclos; nenhuma task de user story pode começar antes do Checkpoint da Phase 2.
- US3: a spec declara dependência apenas de US1 (independência de lógica); a ordem prática exige US2 porque o fluxo de 401/logout é exercitado dentro do shell (T018/T025) — dependência de *validação*, não de lógica.

## Parallel Execution Examples

- **Phase 2**: T005 ∥ T007 ∥ T008 (arquivos distintos) — depois T006, T009, T010, T011 [P]
- **US2**: T018 ∥ T019 ∥ T020 (arquivos de rota distintos) após T016/T017
- **US3**: T025 (componente) ∥ T026 (fluxo) após T022–T024
- **US4**: T029 ∥ T030 após T028
- **Entre stories**: não paralelizar US3/US4 entre si (dependem do shell), mas T019/T020 podem ser feitos durante US1 sem conflito
- **Phase 10**: T042 ∥ T043 ∥ T044 ∥ T045 ∥ T046 (arquivos distintos) após T039→T040→T041; T047 fecha o ciclo com os gates de constituição
- **Phase 11**: T048 ∥ T049 (docs distintos); T050 após eles (mesmo fluxo de shell/restauração de identidade)

## Implementation Strategy

1. **MVP primeiro**: fases 1+2+US1 entregam login funcional com mocks
   marcados — demonstrável sozinho (C1).
2. **Incrementos**: US2 (RBAC navegável) → US3 (sessão sólida) → US4 (shell
   com placeholders) — cada um valida seus cenários de quickstart antes de
   seguir.
3. **Gates**: toda task termina com `pnpm lint`/`pnpm build` limpos
   (Constraint 5); a task T027 é a única que exige manipular expiração de
   token (fixtures configuráveis, research D6).
4. **Constituição**: T032 é gate de encerramento — divergência com princípio
   reprova o ciclo independentemente de "funcionar" (Governança da
   constituição).

## Notes

- Sem testes automatizados nesta spec (research.md D7); cenários de
  `quickstart.md` são a validação formal.
- Nenhum componente de mapa ou gráfico nesta feature (research D8) — SPE-03
  e SPE-07.
- Tasks de SPE-02..07 devem consumir somente as superfícies de
  `contracts/panel-session.md` (nenhuma feature toca cookies/JWT/FastAPI
  direto).
- FR-014 (403 ⇒ estado de erro da ação): classificação pronta (T005/T009);
  o wiring em UI visível entra com a primeira feature que consumir endpoint
  de negócio real (SPE-02..07) — nenhum placeholder desta fundação chama API.

## Status da implementação (2026-10-30)

- **Validação automática executada** (matriz de guardas em produção, modo
  mock): admin acessa `/`, `/admin/*` e `/beneficios` (200); funcionário
  é redirecionado a `/beneficios` em `/` e em `/admin/*` (307); `/login`
  com sessão ativa redireciona por papel; sessão expirada com cookie de
  refresh passa (renovação transparente, US3); sessão expirada sem
  refresh e cookie inválido ⇒ `/login` com limpeza de cookies; túnel BFF
  responde 503 no modo mock; navegação do shell condicional verificada
  (funcionário vê apenas "Benefícios"). Gates `pnpm lint` + `pnpm build`
  limpos no estado final.
- **Tasks 50/51 `[X]`** (após Phase 12, 2026-11-06) — única aberta: **T047** (rodada de navegador dos cenários C1–C5 no modo real; revalidação de identidade via `/me` validada por HTTP — ver abaixo).
- **Status (2026-11-06):** o compare de contrato foi re-executado contra a
  API real — o serviço de `localhost:8000` era o "ADA Backend" (sistema
  alheio); a "Passanorte API" roda em `http://localhost:8010`. O `/speckit-analyze`
  de 2026-11-06 encontrou **3 CRITICAL** (F1 payload camelCase sem `user`;
  F2 papéis `"admin"`/`"employee"` vs enum PT no código; F3 prefixo
  `/api/v1/` ausente) e gaps H1–H4 — **Phase 10 executada** (T039–T046
  `[X]`; gates lint/build limpos). **Rodada de validação real executada
  por HTTP em produção (`pnpm start` + API real):** sem sessão ⇒
  `/login?next=/` (307); admin 200 em `/`, 5× `/admin/*` e `/benefits`;
  funcionário 307 `/benefits?next=<rota tentada>` nas administrativas e
  `/benefits` (200); `/login` ativa redireciona por papel (307); papel
  inválido no cookie ⇒ `/login` (nunca acesso por omissão); BFF repassa
  `GET /api/v1/employees` (200); renovação transparente com 401 real ⇒
  replay concluído (200) e **token rotacionado persistido nos cookies de
  saída (T043)** — recusa do refreshToken antigo confirmada no backend.
  **Phase 11 (T048–T050 `[X]`):** plan.md Constraints sincronizado; cadeia
  Phase 10/11 registrada na árvore de Dependencies e exemplos paralelos;
  revalidação de identidade via `GET /api/v1/auth/me` ligada na restauração
  da moldura (FR-016 — cookie como primeira camada; divergência de papel ⇒
  redireção explícita para a área do novo papel; `ContractViolationError` ⇒
  login — verificado por HTTP em produção).
  **Phase 12 (T051 `[X]`, 2026-11-06):** papel não reconhecível na gravação
  da sessão é agora divergência explícita de contrato — `ContractViolationError`
  em `setSession` (`src/features/auth/session/index.ts`), log
  `[contract-divergence] POST /api/v1/auth/refresh` + `clearSession` no
  refresh (falha de sessão, sem loop); loginAction (DIVERGENT), BFF (502) e
  PanelShell (`/me`) já mapeavam a classe. Gates `pnpm lint`/`pnpm build`
  limpos no estado final.
  Pendente de navegador (owner): envio do formulário com feedback
  pendente (C1), concorrência simultânea observada em rede (C3.3/SC-003)
  e navegação só por teclado (C5.4/FR-019) — T047 aberta.
- **Phase 8 (Convergence) executada 2026-10-30:
  T035 (`mockMe` — token fixture agora carrega o username, reprodução
  confirmada com 200/operador), T036 (BFF captura erros de upstream —
  503/502 JSON limpo, sem 500 estruturado do Next) e T037 (export não
  utilizado removido) concluídas e revalidadas em runtime (guardas intactas,
  BFF mock 503 limpo). As 4 tasks de validação que exigem navegador
  (`T015`, `T027`, `T031`, `T034`) permanecem abertas para a rodada manual
  dos cenários C1 (envio do formulário), C3 (renovação/logout em uso) e
  C5 (teclado): guia em `quickstart.md` — servidor disponível com
  `pnpm dev` (ou `pnpm start`) e fixtures `admin/admin` e
  `funcionario/funcionario` (TTL configurável em
  `MOCK_SESSION_TTL_SECONDS`).

## Phase 8: Convergence

**Purpose**: fechar gap entre artefatos e código (avaliação de 2026-10-30,
pós-implementação — evidências executadas/reprouzidas em runtime)

- [X] T035 Corrigir `mockMe` em `src/features/auth/api/mock.ts` (linha ~91): `forgeToken` grava o PAPEL no token (`mock:v1:<role>:<exp>`) mas o `mockMe` procura usuário por `accessToken.split(":")[2]` — reprodução confirmou `null` para token válido; alinhar a chave (emitir username em vez de role, ou buscar por role de fixture) para que GET `/auth/me` devolva o operador 200 conforme `contracts/auth-api.md` ("GET /auth/me") (partial)
- [X] T036 Tratar falhas de upstream na rota BFF `src/app/api/proxy/[...path]/route.ts` (research D3, FR-015, Princípio V): exception de rede/timeout na chamada a `API_BASE_URL` (ou em `refreshSession`) hoje estoura 500 estruturado pelo Next; capturar `ApiUnavailableError`/`ContractViolationError` e responder JSON `{"detail": ...}` com 503/401 limpo, mantendo os desfechos da spec (partial)
- [X] T037 Remover exportação não utilizada `MOCK_FIXTURE_CREDENTIALS` em `src/features/auth/api/mock.ts` (ou consumi-la na documentação de fixtures do quickstart) (unrequested)

## Phase 9: Convergence

**Purpose**: segunda rodada (2026-10-30) — reavaliação pós-Phase 8; único
residual de código

- [X] T038 Proteger o parse de `MOCK_SESSION_TTL_SECONDS` em `src/features/auth/api/mock.ts` (linha 13) com `Number.isFinite` + fallback para 3600 — env malformado hoje produz `NaN` ⇒ tokens fixtures sempre expirados e cenário C3 quebrado silenciosamente (T007/research D6) (partial)

## Phase 10: Convergence — contrato real confirmado (2026-11-06)

**Purpose**: alinhar código e artefatos ao contrato re-confirmado contra a
API real "Passanorte API" em `http://localhost:8010` (compare campo a campo
de 2026-11-06; clarificação da sessão em spec.md). Resolve os achados
F1–F3 (CRITICAL), H1–H4 e M1–M4 do `/speckit-analyze` — origem: os artefatos
e o código foram escritos em 2026-10-30 contra o **baseline** vencido.
A spec NÃO muda (já descreve o contrato confirmado).

- [X] T039 [US1] Alinhar parse do contrato em `src/features/auth/api/index.ts` e `src/features/auth/types/index.ts` (F1): `SessionResponse` camelCase (`accessToken`, `refreshToken`, `tokenType`, `expiresIn` número, `role` na **raiz**) — remover `user`/`Operator` do corpo 200; ajustar `LoginResponse`/`PanelSession`; validação 401 reconhece `errorCode: "authentication_failed"` (formato `ApiError`), 422 continua `HTTPValidationError` (fonte: `contracts/auth-api.md` re-confirmado)
- [X] T040 [US2] Mapeamento explícito de papel (F2): `Role` canônico = `"admin" | "employee"` (valores exatos confirmados por login real — sem normalização de acento); atualizar `normalizeRole`, `src/features/auth/guards/index.ts` e rótulos de UI ("Administrador"/"Funcionário" como *display* sobre o valor canônico); papel fora do mapa ⇒ falha de sessão (Princípio II inalterado)
- [X] T041 [US1] Prefixo de versão (F3): todas as chamadas auth (`login`, `refresh`, `logout`, `me` em `src/features/auth/api/index.ts`) usam `${API_BASE_URL}/api/v1/auth/...`; atualizar comentários de T006/T022/T024 que citam `/auth/*`
- [X] T042 [US2] Return-to clampado (H1, FR-011 — clarificação 2026-11-06): `src/proxy.ts` + guards persistem o destino pretendido no redirect ao `/login` (parâmetro `?next=` não-sensível, nunca com dado de sessão); a Server Action de login (`src/features/auth/actions/login.ts`) devolve ao destino **validado por `roleCanAccess`** (clamp ao papel: funcionário que tentou `/admin/*` cai em `/benefits`); sem `next` ⇒ área inicial do papel; validar em C2
- [X] T043 [US3] Persistir token rotacionado (H3, FR-006): `refreshSession` (`src/features/auth/session/refresh.ts`) grava o **novo** `refreshToken` da resposta (uso único, rotação confirmada em login real) no cookie httpOnly server-side antes de resolver — duas renovações seguidas não falham; validar em C3
- [X] T044 [US3] Remover fallback de logout (M1): em `logout()` (`src/features/auth/api/index.ts`), 404/405 deixa de ser "logout apenas local" e vira divergência explícita (`ContractViolationError`/anotação no artefato — Princípio I); 401 permanece "logout concluído" (contrato confirmado: 204)
- [X] T045 [P] Docs: sincronizar artefatos à árvore e ao contrato confirmados (H2, M2–M4, L1): `data-model.md` (Operador = `username`+`role`, sem `id`/`name`; rotas em inglês; logout/`me` confirmados; rotação do refresh), `contracts/panel-session.md` (`(panel)`, `/benefits`, `/api/v1/auth/*`), plan.md (Project Structure em inglês + Summary sem "backend não acessível"), `tasks.md` Path Conventions + condição do T029 (`/me` confirmado), quickstart.md (modo real em `8010`; seeds de teste informados pelo owner, NUNCA registrados em artefatos)
- [X] T046 [US1] Remover mocks temporários (H4, Princípio I): apagar `src/features/auth/api/mock.ts` e fixtures (`MOCK_FIXTURE_*`, `MOCK_SESSION_TTL_SECONDS`); `API_BASE_URL` obrigatória em `.env.example`; `grep` garante que nenhum arquivo importa o mock (T032 re-executa as checagens I–V)
- [ ] T047 [US4] Validar C1–C5 do quickstart.md **no modo real** (`API_BASE_URL=http://localhost:8010`), incluindo return-to clampado (T042) e renovação dupla com rotação (T043); registrar resultados + gates `pnpm lint`/`pnpm build` no estado final — encerra a rodada de validação correspondente a T015/T027/T031/T034
## Phase 11: Convergence

**Purpose**: rodada pós-implementação da Phase 10 (2026-11-06) — gaps
restantes entre artefatos e código: documentação do plan obsoleta, árvore
de dependências sem Phase 10 e revalidação de identidade via `/me`
(FR-016) ainda não ligada.

- [X] T048 Atualizar a linha **Constraints** do plan.md (plan: Constraints — partial): remover a exigência "mocks temporários obrigatoriamente marcados (Princípio I)" (T046 removeu os mocks; contrato confirmado em `contracts/auth-api.md`) e refletir "API_BASE_URL obrigatória + divergência de contrato como erro explícito"
- [X] T049 Incluir a cadeia Phase 10 no bloco **Dependencies** e nos **Parallel Execution Examples** do tasks.md (tasks: Dependencies — partial): T039→T040→T041 → T042/T043/T044/T045/T046 [P] → T047
- [X] T050 Ligar a revalidação de identidade da sessão via `GET /api/v1/auth/me` no caminho de restauração da moldura (FR-016 / spec "Contrato da API" — partial): em `src/features/auth/components/PanelShell.tsx`, revalidar `{username, role}` server-side quando restaurar a sessão; divergência de identidade/papel (401/valor fora do enum) ⇒ falha de sessão (edge case — nunca acesso por omissão, Princípio I/II); manter a leitura do cookie como primeira camada de render

## Phase 12: Convergence

**Purpose**: rodada pós-implementação da Phase 11 (2026-11-06) —
`/speckit-converge` (gates lint/build limpos; 19 FRs + 15 cenários verificados
em código; 1 finding `partial` LOW).

- [X] T051 Tratar papel não reconhecível como divergência de contrato (edge case 1 da spec + Princípio I — partial): em `setSession` (`src/features/auth/session/index.ts`), lançar `ContractViolationError` (não `Error` genérico) quando `normalizeRole` devolver null — cobre login e refresh (T043); em `loginAction`, o erro chega ao operador como mensagem DIVERGENT ("Resposta no formato inesperado — operação registrada"), não UNAVAILABLE; no fluxo de refresh (`src/shared/lib/http.ts`/BFF), a divergência é explícita (502 com detalhe, sem loop de tentativas); logar como `[contract-divergence]` para registro nos artefatos — *executada 2026-11-06: `session/index.ts` lança ContractViolationError; `session/refresh.ts` loga `[contract-divergence] POST /api/v1/auth/refresh` + `clearSession` (falha de sessão, sem loop); loginAction/BFF/PanelShell já mapeavam a classe (DIVERGENT / 502 / redirect /login)*
