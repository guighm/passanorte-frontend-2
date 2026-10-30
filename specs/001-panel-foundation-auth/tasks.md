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
`src/features/auth/`, transversais em `src/shared/`, rotas em `src/app/`,
guarda global em `src/proxy.ts`). Backend FastAPI é outro repositório
(baseline de contrato em `contracts/auth-api.md`; mocks marcados).

**Gates de TODA task** (Constraint 5 da constituição): `pnpm lint` e
`pnpm build` sem erros antes de marcar a task como concluída. Acessibilidade
mínima (teclado, labels) faz parte de pronto (FR-019).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Estrutura de diretórios da fundação e configuração de ambiente

- [ ] T001 Create fundação directories `src/features/auth/{api,session,components,guards}`, `src/shared/lib` e `src/app/api/proxy/[...path]` conforme Project Structure de plan.md
- [ ] T002 [P] Create `.env.example` documentando `API_BASE_URL` (ausente ⇒ modo mock marcado, research D6) sem chaves sensíveis no código-fonte (Princípio III)
- [ ] T003 Run baseline gates `pnpm lint` e `pnpm build` no template atual e registrar resultado de partida

**Checkpoint**: estrutura pronta — camadas transversais podem ser construídas

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos, camada de API, sessão httpOnly, cliente HTTP e guarda
mínimo — pré-requisito de TODAS as user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Define domain types em `src/features/auth/types.ts`: `Operator` (`id`, `username`, `name`, `role`), `Role` = `"administrador" | "funcionário"` (enum fechado — data-model.md), `LoginResponse` (com `access_token`, `refresh_token`, `token_type`, `expires_in`, `user`), `PanelSession`; `role` fora do enum ⇒ tratar como falha de sessão (edge case da spec)
- [ ] T005 [P] Define error/result types de contrato em `src/features/auth/api/errors.ts`: `AuthInvalidCredentialsError` (401), `ApiUnavailableError` (5xx/rede), `ContractViolationError` (payload fora do baseline — Princípio I: divergência NUNCA reinterpretada silenciosamente), `AuthorizationDeniedError` (403)
- [ ] T006 Implement auth api layer em `src/features/auth/api/index.ts`: `login`, `logout`, `me` conforme `contracts/auth-api.md` (rotas `/auth/*`, prefixo `API_BASE_URL` via env, Princípio III); nenhum outro arquivo do app importa a API direto (Princípio I)
- [ ] T007 [P] Implement mock fixtures server-side em `src/features/auth/api/mock.ts` para os 4 endpoints `/auth/*`, cada módulo marcado `// MOCK (temporary): remove when /auth/* is live` (research D6); fixtures: usuário `admin` (papel `administrador`) e `funcionario` (papel `funcionário`); ativa apenas quando `API_BASE_URL` não definida; expiração curta configurável para o cenário C3
- [ ] T008 Implement session storage server-side em `src/features/auth/session/index.ts`: `getSession`, `setSession`, `clearSession`, `refreshSession` conforme `contracts/panel-session.md` — `cookies()` async (Next 16), cookies httpOnly `SameSite=Lax`, `Secure` em produção, expiração alinhada a `expires_in`; gravação somente em Route Handlers/Server Actions (doc cookies.md, research D2)
- [ ] T009 Implement shared HTTP client em `src/shared/lib/http.ts`: `apiFetch` anexando Authorization a partir da sessão server-side (`http.ts` — nunca do cliente), classificação de 401/403/contrato via T005, helpers de estado consumidos pela UI (Princípio V); tratamento de 401/refresh é wired em US3 (T021/T022)
- [ ] T010 Implement BFF minimal tunnel `src/app/api/proxy/[...path]/route.ts`: repassa método/corpo/caminho a `API_BASE_URL` anexando sessão server-side; não reinterpreta payloads (research D3)
- [ ] T011 Implement minimal route guard em `src/proxy.ts` (convenção `proxy.ts` de Next 16, NÃO `middleware.ts` deprecated — research D1): sem sessão em rota protegida ⇒ redirect `/login`; `/login` é a única rota pública

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

- [ ] T012 [US1] Create Login Server Action em `src/features/auth/actions/login.ts`: lê FormData (username, password), chama `login()` (T006), em sucesso grava sessão (`setSession`, T008) e redireciona por papel (administrador→`/`, funcionário→`/beneficios`, research D5); NUNCA valida/compara credenciais localmente (FR-002, Princípio II); mapeia erros (T005) para mensagens acionáveis sem revelar detalhes técnicos
- [ ] T013 [P] [US1] Create `LoginForm` component em `src/features/auth/components/LoginForm.tsx`: `<form action>` + `useActionState` (padrão do guia authentication.md — research D4), campos com `<label>` acessíveis, estado pending desabilitando envio, mensagem de erro visível e distinta (FR-003, FR-019)
- [ ] T014 [US1] Create `/login` page em `src/app/login/page.tsx`: rota pública única (fora do grupo de layout do painel), renderiza `LoginForm`, e com sessão ativa redireciona por papel (não reexibir login); exibe aviso de sessão encerrada quando redirecionada pelo fluxo de expired-session (parâmetro de navegação, consumido por T024)
- [ ] T015 [US1] Validate C1 do quickstart.md no modo mock: os 5 passos (login admin → `/`, logout, login funcionário → `/beneficios`, credencial inválida, backend desligado → erro de comunicação) + gates lint/build

**Checkpoint**: MVP funcional — login por papel funciona com mocks marcados

---

## Phase 4: User Story 2 — Acesso às áreas por papel (Priority: P1)

**Goal**: Funcionário não alcança seções administrativas por navegação nem
por endereço (FR-010..FR-014, SC-002, SC-005)

**Independent Test**: C2 de `quickstart.md` — com sessão funcionário, rotas `/`, `/admin/*` redirecionam a `/beneficios` sem render (reload incluído); admin vê tudo

### Implementation for User Story 2

- [ ] T016 [US2] Create guard map em `src/features/auth/guards/index.ts`: `roleCanAccess(role, pathPattern)` com mapa `"/"→admin`, `"/admin/*"→admin`, `"/beneficios"→admin|funcionário`, `"/login"` pública (contracts/panel-session.md); valor único de papel retornado pela API — painel NUNCA deduz papel (FR-013, Princípio II)
- [ ] T017 [US2] Extend `src/proxy.ts` com guardas por papel (T008, T016): rota bloqueada para o papel ⇒ redirect à rota permitida do papel (funcionário→`/beneficios`), sem renderizar a página bloqueada; papel válido porém sem valor no mapa ⇒ tratar como sessão inválida (edge case); segunda camada de papel no `(painel)/layout.tsx` server-side (research D1)
- [ ] T018 [P] [US2] Create route group `(painel)` em `src/app/(painel)/layout.tsx` com shell base: sessão lida server-side (T008), navegação condicional ao papel via guards (T016) — admin vê todos os itens, funcionário apenas `Benefícios` (FR-012); sem item de logout nesta fase (US3)
- [ ] T019 [P] [US2] Create placeholder pages admin: `src/app/(painel)/page.tsx` (home; T030 a completa) e `src/app/(painel)/admin/{funcionarios,pontos,eventos,rotas,dashboard}/page.tsx` com placeholders estáticos mínimos e mensagem "seção definida na spec correspondente" (FR-017; sem dados da cidade fixados — FR-018)
- [ ] T020 [P] [US2] Create `/beneficios` placeholder em `src/app/(painel)/beneficios/page.tsx`: landing do funcionário com placeholder da área de concessão (SPE-06 definir)
- [ ] T021 [US2] Validate C2 do quickstart.md: guardas por endereço com reload (funcionário bloqueado em `/` e 5 rotas `/admin/*`, admin libera todas; navegação condicional correta) + gates lint/build

**Checkpoint**: RBAC de superfície completo — base do shell navegável

---

## Phase 5: User Story 3 — Ciclo da sessão (Priority: P2)

**Goal**: Renovação transparente no 401, sem loops; logout explícito; sessão
encerrada leva ao login com aviso (FR-006..FR-009)

**Independent Test**: C3 de `quickstart.md` — renovação invisível, uma única
chamada de refresh por ciclo, sem loop, logout esvazia sessão

### Implementation for User Story 3

- [ ] T022 [US3] Implement coordinated refresh em `src/features/auth/session/refresh.ts` (estende T008): chamada única em curso por ciclo com mutex in-process (US3 cenário 4), `POST /auth/refresh` conforme `contracts/auth-api.md`; falha (401/expirado/recusado) ⇒ `clearSession` + sinal de sessão encerrada (FR-007) — NUNCA retratar renovação indefinidamente
- [ ] T023 [US3] Wire 401 flow em `src/shared/lib/http.ts` (estende T009): em 401, uma única renovação via T022 e replay da requisição original com o novo token (US3 cenário 1); renovação falha ⇒ chamadas em curso falham com estado de sessão encerrada (não erro de ação — FR-009)
- [ ] T024 [US3] Create logout Server Action em `src/features/auth/actions/logout.ts`: `POST /auth/logout` quando backend ativo (401 tratado como logout concluído — contracts/auth-api.md), `clearSession` sempre (`contracts/panel-session.md`), depois redireciona ao `/login`; endpoint não existente (404/405) ⇒ logout apenas local com anotação de divergência nos artefatos (contracts/auth-api.md)
- [ ] T025 [P] [US3] Add LogoutButton component em `src/features/auth/components/LogoutButton.tsx`: aciona T024 via `useTransition` (pendente visível), operável por teclado, item do cabeçalho do shell (FR-019)
- [ ] T026 [US3] Add aviso de sessão encerrada: quando `refreshSession` (T022) encerra sessão durante uso, redirect ao `/login` com aviso (T014 exibe) — operador ciente de que a ação não será concluída (edge case da spec, sem perda silenciosa)
- [ ] T027 [US3] Validate C3 do quickstart.md: (1) renovação transparente pós-expiração; (2) refresh falho ⇒ login com aviso, sem loop na aba de rede; (3) duas ações simultâneas ⇒ UMA chamada de refresh; (4) logout limpa sessão e token antigo não autoriza mais + gates lint/build

**Checkpoint**: ciclo completo de sessão conforme RNF09

---

## Phase 6: User Story 4 — Shell de layout e página inicial (Priority: P2)

**Goal**: Moldura transversal com identificação da sessão no cabeçalho e
home com placeholders por seção, estados loading/vazio/erro (FR-016..FR-019)

**Independent Test**: C5 de `quickstart.md` — nav condicional correta por
papel, cabeçalho com nome+papel, placeholders com três estados, teclado

### Implementation for User Story 4

- [ ] T028 [US4] Create API status components em `src/shared/components/`: `LoadingState`, `EmptyState`, `ErrorState` (padrão de `Button`/`DataTable` — Princípio IV), reutilizáveis por todas as features; mensagens acionáveis (Princípio V)
- [ ] T029 [P] [US4] Add operador ao cabeçalho do `(painel)/layout.tsx` (estende T018): nome+papel vindos da sessão server-side (GET `/auth/me` apenas revalida quando o contrato o confirmar — contracts/auth-api.md); logout já presente via T025
- [ ] T030 [US4] Rebuild `/` home em `src/app/(painel)/page.tsx` (estende T019): grid de placeholders por seção do painel (Dashboard e Insights, Pontos Turísticos, Eventos, Rotas e Benefícios, Funcionários) usando T028; placeholders ESTÁTICOS nesta fundação (análise E1: nenhum endpoint de seção existe no contrato — SPE-02..07 integrarão os dados; NENHUM endpoint inventado no frontend, Princípio I); os componentes de estado (T028) ficam prontos para consumo das features seguintes — sem nenhum dado da cidade fixado no código (FR-017, FR-018, Princípio IV)
- [ ] T031 [US4] Validate C5 + acessibilidade do quickstart.md: navegação condicional por papel, cabeçalho com nome+papel, placeholders estáticos + componentes de estado prontos (T028, FR-017/FR-018), operação só por teclado com labels (FR-019) + gates lint/build

**Checkpoint**: fundação completa — SPE-02..07 consomem `contracts/panel-session.md`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Conformidade com constituição e encerramento do ciclo

- [ ] T032 Constitution review do código entregue: Princípios I–V e Constraints 1–5 do plan.md — verificar `grep` por imports da FastAPI fora de `src/features/auth/api` (I), por decisão de autorização no cliente (II), por token acessível a JS/`localStorage` (III), por dados de cidade fixados (IV), por interação com API sem estados (V) e por uso de `middleware.ts` deprecated (Constraint 2)
- [ ] T033 [P] Register follow-up de contrato: registrar em `docs/SPECS.md` (Seção 2) que, quando o backend subir, o compare campo a campo de `contracts/auth-api.md` contra o Swagger real é task obrigatória do ciclo — divergências editam spec+contrato ANTES da SPE-01 ser encerrada (Assumptions da spec)
- [ ] T034 Run full final: `pnpm lint` + `pnpm build` sem erros e todos os cenários C1–C5 de `quickstart.md` passando no modo mock; registrar resultado

---

## Dependencies

```text
Phase 1 (Setup)
  └→ Phase 2 (Foundational) — T001→T004→T005/T007/[P]→T008→T006/T009→T010/T011
        └→ US1 (T012→T013→T014→T015)  [P1 · MVP]
        └→ US2 (T016→T017→T018→T021; T019/T020 paralelos)  [P1 · depende de US1: teste com sessão]
        └→ US3 (T022→T023→T024→T025/T026→T027)  [P2 · depende de US1+US2 (header/cabeçalho e shell)]
        └→ US4 (T028→T029/T030→T031)  [P2 · depende de US2+US3 (shell, logout e estados de sessão)]
              └→ Phase 7 (Polish)
```

- US1 requer a fundação (T004–T011).
- US2 reutiliza sessão (T008) e guardas (T011); exige US1 para criar sessões de teste.
- US3 depende de US1+US2 (requer navegação/uso em shell para exercitar 401 e logout).
- US4 depende de US2+US3 (shell base T018, cabeçalho com logout T025).
- Sem ciclos; nenhuma task de user story pode começar antes do Checkpoint da Phase 2.

## Parallel Execution Examples

- **Phase 2**: T005 ∥ T007 ∥ T008 (arquivos distintos) — depois T006, T009, T010, T011 [P]
- **US2**: T018 ∥ T019 ∥ T020 (arquivos de rota distintos) após T016/T017
- **US3**: T025 (componente) ∥ T026 (fluxo) após T022–T024
- **US4**: T029 ∥ T030 após T028
- **Entre stories**: não paralelizar US3/US4 entre si (dependem do shell), mas T019/T020 podem ser feitos durante US1 sem conflito

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